import { jsPDF } from 'jspdf'

// Brand colours as RGB (jsPDF has no CSS variable access)
const DEEP_BLUE: [number, number, number] = [10, 22, 40]
const ELECTRIC_BLUE: [number, number, number] = [30, 144, 255]
const BLUE_LIGHT: [number, number, number] = [230, 241, 251]
const GRAY: [number, number, number] = [107, 114, 128]

export interface TestReportData {
  studentName: string
  date: string
  readingScore: number
  vocabularyScore: number
  listeningScore: number
  levelLabel: string
  strengths: string[]
  improvements: string[]
  recommendation: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available'))
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

/** Generate and download the branded level test lab report PDF */
export async function generateTestReportPdf(data: TestReportData): Promise<void> {
  const doc = new jsPDF() // A4 portrait, mm units
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 0

  // Header band
  doc.setFillColor(...DEEP_BLUE)
  doc.rect(0, 0, pageWidth, 42, 'F')

  // Official logo & uppercase branding
  let textX = margin
  try {
    const logoImg = await loadImage('/images/Logo1_no_bg.png')
    const logoH = 22
    const logoW = (logoImg.width / logoImg.height) * logoH
    doc.addImage(logoImg, 'PNG', margin, 10, logoW, logoH)
    textX = margin + logoW + 5
  } catch (err) {
    console.warn('Could not load logo for PDF:', err)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('LANGUAGE LABS', textX, 21)
  doc.setTextColor(...ELECTRIC_BLUE)
  doc.setFontSize(12)
  doc.text('Level Test — Lab Report', textX, 30)

  // Student + date
  y = 54
  doc.setTextColor(...DEEP_BLUE)
  doc.setFontSize(12)
  doc.text(data.studentName, margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.setFontSize(10)
  doc.text(data.date, pageWidth - margin, y, { align: 'right' })

  // Section scores with bars
  y += 14
  const scores = [
    { label: 'Reading', value: data.readingScore },
    { label: 'Vocabulary', value: data.vocabularyScore },
    { label: 'Listening', value: data.listeningScore },
  ]
  const barWidth = pageWidth - margin * 2 - 40
  for (const score of scores) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...DEEP_BLUE)
    doc.text(score.label, margin, y)
    doc.text(`${score.value}%`, pageWidth - margin, y, { align: 'right' })

    doc.setFillColor(...BLUE_LIGHT)
    doc.roundedRect(margin, y + 3, barWidth + 40, 5, 2.5, 2.5, 'F')
    if (score.value > 0) {
      doc.setFillColor(...ELECTRIC_BLUE)
      doc.roundedRect(
        margin,
        y + 3,
        ((barWidth + 40) * score.value) / 100,
        5,
        2.5,
        2.5,
        'F'
      )
    }
    y += 18
  }

  // Speaking pending note
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  doc.text(
    'Speaking: pending admin review — result will be emailed to you.',
    margin,
    y
  )

  // Level banner
  y += 12
  doc.setFillColor(...ELECTRIC_BLUE)
  doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text(`Your starting point: ${data.levelLabel}`, pageWidth / 2, y + 10, {
    align: 'center',
  })

  // Strengths / improvements
  y += 30
  doc.setFontSize(12)
  doc.setTextColor(...DEEP_BLUE)
  doc.text('Strengths', margin, y)
  doc.text('Areas to Improve', pageWidth / 2 + 5, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  const strengthLines = data.strengths.length
    ? data.strengths.map((s) => `• ${s}`)
    : ['• Keep experimenting!']
  const improveLines = data.improvements.length
    ? data.improvements.map((s) => `• ${s}`)
    : ['• Nothing major — great work!']
  doc.text(strengthLines, margin, y + 7)
  doc.text(improveLines, pageWidth / 2 + 5, y + 7)

  // Recommendation
  y += 7 + Math.max(strengthLines.length, improveLines.length) * 5 + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...DEEP_BLUE)
  doc.text('Recommended Starting Point', margin, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...GRAY)
  const recommendation = doc.splitTextToSize(
    data.recommendation,
    pageWidth - margin * 2
  )
  doc.text(recommendation, margin, y + 7)

  // Footer
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(
    'LANGUAGE LABS — Learn English the scientific way',
    pageWidth / 2,
    285,
    { align: 'center' }
  )

  doc.save('language-labs-report.pdf')
}
