'use client'

import dynamic from 'next/dynamic'

const Editor = dynamic(() => import('@/components/editor/App'), { ssr: false })

export default function CreatePage() {
  return <Editor />
}
