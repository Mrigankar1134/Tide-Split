import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = () => process.env.S3_BUCKET;
let client: S3Client | null = null;
const s3 = () => (client ??= new S3Client({ region: process.env.AWS_REGION ?? "ap-south-1" }));

export const s3Configured = () => Boolean(bucket() && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

export async function presignUpload(key: string, contentType: string) {
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn: 300 });
}

export async function presignView(key: string) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 3600 });
}

export async function removeObject(key: string) {
  try { await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })); } catch { /* best effort */ }
}
