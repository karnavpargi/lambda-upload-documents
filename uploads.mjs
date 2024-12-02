import AWS from "aws-sdk";
import { v4 } from "uuid";

const extensions = {
  "application/pdf": ".pdf",
};
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION,
});

export const handler = async (event) => {
  try {
    if (!event.body || !event.isBase64Encoded) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Invalid binary data." }),
      };
    }

    const buffer = Buffer.from(event.body, "base64");
    let fields = buffer.toString();

    fields = fields.split("\r\n").splice(0, 3);
    const contentType = fields.find((field) =>
      field.startsWith("Content-Type:")
    );

    const mimeType = contentType.split(":")[1].trim();
    const contentDisposition = fields.find((field) =>
      field.startsWith("Content-Disposition:")
    );
    const fileName = contentDisposition
      .split(";")[2]
      .split("=")[1]
      .trim()
      .replace(/"/g, "");

    const extension = extensions[mimeType];

    if (!extension) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Filetype invalid: " + mimeType }),
      };
    }

    // const fileName = `${event.requestContext.path.replace(
    //   "/",
    //   ""
    // )}/${v4()}${extension}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: `${event.requestContext.path.replace("/", "")}/${fileName}`,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read",
    };

    const data = await S3.upload(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        key: data.key,
        Location: data.Location,
        message: "File uploaded successfully",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || error,
        message: "Error uploading file",
      }),
    };
  }
};
