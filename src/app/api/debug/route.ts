import { NextResponse } from 'next/server'

export async function GET() {
  const region = process.env.REKOGNITION_REGION
  const accessKey = process.env.REKOGNITION_ACCESS_KEY_ID
  const secretKey = process.env.REKOGNITION_SECRET_ACCESS_KEY

  return NextResponse.json({
    region: {
      value: region,
      length: region?.length,
      trimmedLength: region?.trim().length,
      charCodes: region ? [...region].map(c => c.charCodeAt(0)) : null,
    },
    accessKey: {
      value: accessKey,
      length: accessKey?.length,
      trimmedLength: accessKey?.trim().length,
    },
    secretKey: {
      length: secretKey?.length,
      trimmedLength: secretKey?.trim().length,
      charCodes: secretKey ? [...secretKey].map(c => c.charCodeAt(0)) : null,
    },
  })
}
