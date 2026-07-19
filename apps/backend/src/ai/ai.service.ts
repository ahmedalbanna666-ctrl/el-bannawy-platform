import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigurationService } from "../config/configuration.service";
import type { SendMessageDto } from "./dto/ai.dto";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigurationService,
  ) {}

  async createConversation(userId: string, title?: string): Promise<unknown> {
    return this.prisma.conversation.create({
      data: {
        userId,
        title: title ?? "New Conversation",
      },
      select: { id: true, title: true, createdAt: true },
    });
  }

  async getConversations(userId: string): Promise<unknown> {
    return this.prisma.conversation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  async getConversation(conversationId: string, userId: string): Promise<unknown> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    if (!conversation) throw new NotFoundException("Conversation not found");
    return conversation;
  }

  async deleteConversation(conversationId: string, userId: string): Promise<unknown> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) throw new NotFoundException("Conversation not found");

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  async sendMessage(userId: string, dto: SendMessageDto): Promise<unknown> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: dto.conversationId, userId, deletedAt: null },
    });

    if (!conversation) throw new NotFoundException("Conversation not found");

    // Store user message
    await this.prisma.conversationMessage.create({
      data: {
        conversationId: dto.conversationId,
        role: "user",
        content: dto.message,
      },
    });

    // Get recent conversation context
    const recentMessages = await this.prisma.conversationMessage.findMany({
      where: { conversationId: dto.conversationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });

    // Build educational context
    let context = "";
    if (dto.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId },
        select: { title: true, unit: { select: { title: true, grade: { select: { name: true } } } } },
      });
      if (lesson) {
        context = `Current lesson: "${lesson.title}" in unit "${lesson.unit.title}" (${lesson.unit.grade.name}). `;
      }
    }

    // Generate AI response (provider-abstracted)
    const aiReply = await this.generateResponse(dto.message, recentMessages.reverse(), context);

    // Store assistant response
    const assistantMsg = await this.prisma.conversationMessage.create({
      data: {
        conversationId: dto.conversationId,
        role: "assistant",
        content: aiReply,
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      reply: aiReply,
      messageId: assistantMsg.id,
      suggestions: this.generateSuggestions(dto.message),
    };
  }

  async getRecommendations(userId: string): Promise<unknown> {
    // Get student's weak areas from quiz/homework data
    const weakQuizzes = await this.prisma.quizAnswer.findMany({
      where: {
        isCorrect: false,
        attempt: { userId, submitted: true },
      },
      take: 5,
      include: {
        question: {
          select: {
            question: true,
            quiz: { select: { lessonId: true, lesson: { select: { title: true } } } },
          },
        },
      },
    });

    const recommendations: { type: string; title: string; reason: string; lessonId?: string }[] = weakQuizzes.map((w) => ({
      type: "review_lesson",
      title: `Review: ${w.question.quiz.lesson.title}`,
      reason: `You missed a question on this quiz`,
      lessonId: w.question.quiz.lessonId,
    }));

    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        type: "practice",
        title: "Keep up the great work!",
        reason: "Continue with your current lessons to maintain progress",
      });
    }

    return { recommendations };
  }

  // --- Private AI Provider Abstraction ---

  private async generateResponse(
    message: string,
    history: { role: string; content: string }[],
    context: string,
  ): Promise<string> {
    const { apiKey, model, endpoint } = this.config.ai;

    const systemPrompt = `You are El-bannawy AI, a helpful English learning assistant for Arabic-speaking students. 
${context}
Always:
- Explain concepts instead of just giving answers
- Use simple English appropriate for the student's level
- Encourage the student to practice
- Stay focused on English language learning
- Never provide inappropriate content
- If you don't know something, say so honestly`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    if (apiKey) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, messages, max_tokens: 500 }),
        });

        if (response.ok) {
          const data = (await response.json()) as { choices: { message: { content: string } }[] };
          return data.choices[0]?.message.content ?? "I couldn't process that. Please try again.";
        }
      } catch {
        // Fall back to rule-based response
      }
    }

    // Rule-based fallback (no API key configured)
    return this.ruleBasedResponse(message, context);
  }

  private ruleBasedResponse(message: string, context: string): string {
    const lower = message.toLowerCase();

    if (lower.includes("hello") || lower.includes("hi")) {
      return `Hello! I'm El-bannawy AI, your English learning assistant. ${context ? `You're currently studying: ${context}` : "How can I help you with your English learning today?"}`;
    }
    if (lower.includes("grammar")) {
      return "Grammar is the foundation of good English! Let me help you understand the rules. Can you tell me which grammar topic you're studying (e.g., tenses, articles, prepositions)?";
    }
    if (lower.includes("vocabulary") || lower.includes("word") || lower.includes("meaning")) {
      return "Building vocabulary is essential for fluency! Try to learn words in context rather than memorizing lists. What specific word or topic are you working on?";
    }
    if (lower.includes("translate") || lower.includes("arabic")) {
      return "I can help you understand English words and phrases. Please share what you'd like me to explain, and I'll help you understand the meaning in context.";
    }
    if (lower.includes("homework") || lower.includes("help")) {
      return "I'm here to help with your homework! I won't just give you the answer — I'll guide you to find it yourself. What are you working on?";
    }
    if (lower.includes("writing") || lower.includes("essay") || lower.includes("paragraph")) {
      return "Writing is a great way to improve your English! Start by organizing your ideas, then write a draft, and finally revise. Would you like tips on structure, grammar, or vocabulary for your writing?";
    }

    return `That's a great question! ${context ? `Since you're studying ${context.trim().replace(/^Current lesson: /, "").replace(/\.$/, "")}, let me help you with that. ` : ""}I'm here to support your English learning journey. Feel free to ask about grammar, vocabulary, writing, or any English topic you're studying!`;
  }

  private generateSuggestions(_message: string): string[] {
    return [
      "Can you explain that in more detail?",
      "Give me an example",
      "How do I practice this?",
      "What's the grammar rule for this?",
    ];
  }
}
