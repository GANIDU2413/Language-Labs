import type { Resource } from '@/types'

export interface CardColor {
  hex: string
  rgb: string
}

/**
 * 6 Card Background colors from courseCards in CourseOverview.tsx
 */
export const COURSE_CARD_COLORS: CardColor[] = [
  { hex: '#0DBFBF', rgb: '13,191,191' },  // 1: Teal
  { hex: '#7C3AED', rgb: '124,58,237' }, // 2: Violet
  { hex: '#16A34A', rgb: '22,163,74' },   // 3: Green
  { hex: '#EAB308', rgb: '234,179,8' },   // 4: Yellow
  { hex: '#2563EB', rgb: '37,99,235' },   // 5: Blue
  { hex: '#EA580C', rgb: '234,88,12' },   // 6: Orange
]

/**
 * 11 Mini character thumbnail images in /public/images/mini-images/
 */
export const MINI_IMAGES: string[] = Array.from(
  { length: 11 },
  (_, i) => `/images/mini-images/mini-c-${i + 1}.png`
)

export interface StyledResource extends Resource {
  cardColor: CardColor
  assignedImage: string
}

/**
 * Dynamically assign card colors and thumbnail images ensuring no neighboring
 * cards (horizontally or in multi-column rows) share the exact same background
 * color or thumbnail image.
 */
export function assignCardStyles(
  resources: Resource[],
  avoidColor?: string,
  avoidImage?: string
): StyledResource[] {
  const result: StyledResource[] = []

  for (let i = 0; i < resources.length; i++) {
    const res = resources[i]

    // Track forbidden colors from immediate neighbor (i - 1), 2-col above (i - 2), and 3-col above (i - 3)
    const forbiddenColors = new Set<string>()
    if (i === 0 && avoidColor) forbiddenColors.add(avoidColor)
    if (i > 0) forbiddenColors.add(result[i - 1].cardColor.rgb)
    if (i >= 2) forbiddenColors.add(result[i - 2].cardColor.rgb)
    if (i >= 3) forbiddenColors.add(result[i - 3].cardColor.rgb)

    const availableColors = COURSE_CARD_COLORS.filter(
      (c) => !forbiddenColors.has(c.rgb)
    )
    const colorPool = availableColors.length > 0 ? availableColors : COURSE_CARD_COLORS
    const chosenColor = colorPool[Math.floor(Math.random() * colorPool.length)]

    // Track forbidden images from immediate neighbor (i - 1), 2-col above (i - 2), and 3-col above (i - 3)
    const forbiddenImages = new Set<string>()
    if (i === 0 && avoidImage) forbiddenImages.add(avoidImage)
    if (i > 0) forbiddenImages.add(result[i - 1].assignedImage)
    if (i >= 2) forbiddenImages.add(result[i - 2].assignedImage)
    if (i >= 3) forbiddenImages.add(result[i - 3].assignedImage)

    const candidateImage = res.thumbnailImage || res.thumbnailUrl
    let chosenImage = ''
    if (
      candidateImage &&
      candidateImage.includes('/mini-images/') &&
      !forbiddenImages.has(candidateImage)
    ) {
      chosenImage = candidateImage
    } else {
      const availableImages = MINI_IMAGES.filter((img) => !forbiddenImages.has(img))
      const imagePool = availableImages.length > 0 ? availableImages : MINI_IMAGES
      chosenImage = imagePool[Math.floor(Math.random() * imagePool.length)]
    }

    result.push({
      ...res,
      cardColor: chosenColor,
      assignedImage: chosenImage,
    })
  }

  return result
}
