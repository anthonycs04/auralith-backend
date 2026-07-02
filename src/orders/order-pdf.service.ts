import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'
import { OrdersService } from './orders.service'

@Injectable()
export class OrderPdfService {
  constructor(private readonly orders: OrdersService) {}

  async createShippingLabel(id: string) {
    const order = await this.orders.get(id)
    const document = new PDFDocument({
      margin: 24,
      size: [288, 432],
    })
    const chunks: Buffer[] = []

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    const done = new Promise<Buffer>((resolve, reject) => {
      document.on('end', () => resolve(Buffer.concat(chunks)))
      document.on('error', reject)
    })

    document.rect(0, 0, 288, 432).fill('#FAF8F3')
    document.fillColor('#222222').font('Times-Bold').fontSize(20)
    document.text('AURALITH', 24, 22, { align: 'center', characterSpacing: 2 })
    document.fillColor('#A8854A').font('Helvetica').fontSize(7)
    document.text('TIENDA HOLISTICA', 24, 47, {
      align: 'center',
      characterSpacing: 1.5,
    })
    document
      .moveTo(24, 64)
      .lineTo(264, 64)
      .lineWidth(1)
      .strokeColor('#C9A86A')
      .stroke()

    document.fillColor('#6B6B6B').fontSize(8).text('PEDIDO', 24, 76)
    document.fillColor('#222222').font('Helvetica-Bold').fontSize(15)
    document.text(order.code, 24, 88)
    document
      .roundedRect(191, 77, 73, 25, 4)
      .fill('#E8E2D6')
      .fillColor('#222222')
      .fontSize(8)
      .text(order.source.toUpperCase(), 191, 86, { align: 'center', width: 73 })

    let y = 122
    const field = (label: string, value: string | null) => {
      document.fillColor('#A8854A').font('Helvetica-Bold').fontSize(7)
      document.text(label.toUpperCase(), 24, y)
      document.fillColor('#222222').font('Helvetica').fontSize(10)
      document.text(value || '-', 24, y + 11, { width: 240 })
      y += 35
    }

    field('Destinatario', order.customer)
    field('DNI', order.documentNumber)
    field('WhatsApp', order.whatsapp)
    field('Ciudad', order.city)
    field('Agencia / entrega', order.deliveryType)
    field('Direccion', order.address)

    document
      .moveTo(24, y - 2)
      .lineTo(264, y - 2)
      .lineWidth(0.7)
      .strokeColor('#C9A86A')
      .stroke()
    y += 10
    document.fillColor('#A8854A').font('Helvetica-Bold').fontSize(7)
    document.text('CONTENIDO', 24, y)
    y += 13

    for (const item of order.items.slice(0, 5)) {
      document.fillColor('#222222').font('Helvetica').fontSize(8)
      document.text(`${item.quantity} x ${item.name}`, 24, y, {
        ellipsis: true,
        width: 170,
      })
      document.font('Helvetica-Bold')
      document.text(`S/ ${item.total.toFixed(2)}`, 202, y, {
        align: 'right',
        width: 62,
      })
      y += 15
    }

    if (order.items.length > 5) {
      document.fillColor('#6B6B6B').font('Helvetica-Oblique').fontSize(7)
      document.text(`+ ${order.items.length - 5} producto(s) adicionales`, 24, y)
      y += 14
    }

    document
      .moveTo(24, y + 1)
      .lineTo(264, y + 1)
      .lineWidth(0.5)
      .strokeColor('#C4B8AB')
      .stroke()
    y += 11
    document.fillColor('#222222').font('Helvetica-Bold').fontSize(11)
    document.text('TOTAL', 24, y)
    document.fillColor('#A8854A')
    document.text(`S/ ${order.total.toFixed(2)}`, 190, y, {
      align: 'right',
      width: 74,
    })
    y += 24

    if (order.note) {
      document.fillColor('#6B6B6B').font('Helvetica-Oblique').fontSize(7)
      document.text(`Nota: ${order.note}`, 24, y, {
        height: 28,
        width: 240,
      })
    }

    document.fillColor('#8FA58C').font('Helvetica').fontSize(6.5)
    document.text(
      `Generado ${new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date())}`,
      24,
      410,
      { align: 'center', width: 240 },
    )

    document.end()
    return done
  }
}
