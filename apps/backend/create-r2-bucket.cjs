const { S3Client, CreateBucketCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");

const accountId = "6c3496f3f565bafa36b5c4b5c6d1a2b0";
const accessKeyId = "00e6c58cf98938d12b1e03ca50d0d1c5";
const secretAccessKey = "302d754eaf951e566965a46422ba8729ae0f8a4f92ea897c329da1ce0f3e749a";
const bucket = "elbannawy-files";

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log("BUCKET_ALREADY_EXISTS");
  } catch (err) {
    if (err && err.name === "NotFound") {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log("BUCKET_CREATED");
    } else if (err && (err.name === "AccessDenied" || (err.$metadata && err.$metadata.httpStatusCode === 403))) {
      console.error("AUTH_FAILED:", err.message);
      process.exit(1);
    } else {
      console.log("CHECK_FAILED_ATTEMPT_CREATE");
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log("BUCKET_CREATED");
      } catch (createErr) {
        console.error("CREATE_FAILED:", createErr.message);
        process.exit(1);
      }
    }
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
