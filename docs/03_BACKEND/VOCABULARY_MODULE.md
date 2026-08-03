# Vocabulary Module

Version: 2.0.0
Source: `apps/backend/src/lesson` and `apps/backend/src/document-import`

## Responsibility

Stores and delivers lesson vocabulary, preserves source-document structure, supports teacher authoring/import, and exposes student vocabulary content in lesson context.

## Persisted Model

- `LessonVocabulary`: word, translation, definition, example, part of speech, display order, and source indexes.
- `VocabularySection`: `STANDARD_VOCABULARY` or `SYNONYM_ANTONYM` with display/source metadata.
- `VocabularyRelation`: primary word/translation with optional synonym and antonym pairs.

## Import Pipeline

```text
DOCX -> mammoth extraction -> semantic table classifier -> V1/V2 parser -> preview -> teacher edits -> persistence
```

The classifier is semantic rather than dependent only on table position. Preview is separate from persistence, and persistence is transactional at the lesson content boundary. The source fixture `docs/word files/vocabs.docx` is an acceptance fixture, not production content.

## Teacher Operations

Teachers can preview/import vocabulary, edit part of speech and item fields, manage structured sections, and bulk delete through the lesson vocabulary management flow, subject to effective permissions.

## Student Operations

Students can view vocabulary attached to an available lesson and use the web vocabulary learning experience. Pronunciation speech support is client-side; the current schema does not provide a pronunciation/audio entity.

## Limitations

- Favorites, spaced repetition, persisted learned-word progress, and vocabulary analytics are not represented in the current Prisma schema.
- Audio/image upload and AI pronunciation scoring are planned, not implemented.
- DOCX layouts outside supported semantic table formats require preview validation.

End of Document.
