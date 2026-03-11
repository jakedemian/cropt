import { NextResponse } from 'next/server'

export async function GET() {
  // Check if Vercel is injecting its own AWS credentials into the environment
  const vercelSessionToken = process.env.AWS_SESSION_TOKEN
  const vercelAccessKey = process.env.AWS_ACCESS_KEY_ID
  const vercelSecretKey = process.env.AWS_SECRET_ACCESS_KEY

  return NextResponse.json({
    vercel_injected: {
      AWS_SESSION_TOKEN_present: !!vercelSessionToken,
      AWS_SESSION_TOKEN_length: vercelSessionToken?.length,
      AWS_SESSION_TOKEN_first20: vercelSessionToken?.slice(0, 20),
      AWS_ACCESS_KEY_ID_present: !!vercelAccessKey,
      AWS_SECRET_ACCESS_KEY_present: !!vercelSecretKey,
    },
    our_vars: {
      REKOGNITION_REGION: process.env.REKOGNITION_REGION,
      REKOGNITION_ACCESS_KEY_ID: process.env.REKOGNITION_ACCESS_KEY_ID,
      REKOGNITION_SECRET_KEY_length: process.env.REKOGNITION_SECRET_ACCESS_KEY?.length,
    },
  })
}
