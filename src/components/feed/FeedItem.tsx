type FeedItemProps = {
  id: string
  imageUrl: string
  width: number | null
  height: number | null
}

export default function FeedItem({ id, imageUrl, width, height }: FeedItemProps) {
  return (
    <a
      href={`/m/${id}`}
      className="block mb-2 overflow-hidden rounded-lg bg-[#2d3139] hover:opacity-90 transition-opacity"
    >
      <img
        src={imageUrl}
        alt="Meme"
        width={width ?? undefined}
        height={height ?? undefined}
        className="w-full h-auto block"
        loading="lazy"
      />
    </a>
  )
}
