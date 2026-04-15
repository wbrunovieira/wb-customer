import { describe, it, expect, vi } from 'vitest'
import { GmailService, SendEmailRequest } from './gmail.service'

/**
 * Tests for GmailService.buildMimeMessage (accessed via type cast).
 * This covers the MIME structure for plain HTML and multipart/mixed with attachments.
 * The full sendEmail flow (Google API call) requires real credentials and is covered by E2E.
 */

function makeMockTokenService() {
  return { getToken: vi.fn() }
}

function buildRaw(sut: GmailService, req: SendEmailRequest): string {
  // buildMimeMessage is private but testable via cast
  return (sut as unknown as { buildMimeMessage: (r: SendEmailRequest) => string }).buildMimeMessage(req)
}

function decodeMime(base64url: string): string {
  // base64url → base64 → utf-8
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}

describe('GmailService.buildMimeMessage', () => {
  const sut = new GmailService(makeMockTokenService() as never)

  describe('plain HTML (no attachments)', () => {
    it('should produce base64url encoded MIME', () => {
      const raw = buildRaw(sut, { to: ['a@b.com'], subject: 'Hello', htmlBody: '<p>Hi</p>' })
      expect(raw).toBeTruthy()
      expect(() => decodeMime(raw)).not.toThrow()
    })

    it('should include To header', () => {
      const raw = buildRaw(sut, { to: ['cliente@empresa.com'], subject: 'Oi', htmlBody: '<p>Oi</p>' })
      expect(decodeMime(raw)).toContain('To: cliente@empresa.com')
    })

    it('should include multiple recipients in To header', () => {
      const raw = buildRaw(sut, { to: ['a@a.com', 'b@b.com'], subject: 'Multi', htmlBody: '<p>multi</p>' })
      expect(decodeMime(raw)).toContain('To: a@a.com, b@b.com')
    })

    it('should include Cc header when cc is provided', () => {
      const raw = buildRaw(sut, { to: ['a@a.com'], cc: ['cc@cc.com'], subject: 'Cc', htmlBody: '<p>cc</p>' })
      expect(decodeMime(raw)).toContain('Cc: cc@cc.com')
    })

    it('should NOT include Cc header when cc is empty', () => {
      const raw = buildRaw(sut, { to: ['a@a.com'], cc: [], subject: 'No Cc', htmlBody: '<p>no cc</p>' })
      expect(decodeMime(raw)).not.toContain('Cc:')
    })

    it('should set Content-Type to text/html', () => {
      const raw = buildRaw(sut, { to: ['a@b.com'], subject: 'S', htmlBody: '<b>bold</b>' })
      expect(decodeMime(raw)).toContain('Content-Type: text/html')
    })

    it('should include MIME-Version header', () => {
      const raw = buildRaw(sut, { to: ['a@b.com'], subject: 'S', htmlBody: '<p>hi</p>' })
      expect(decodeMime(raw)).toContain('MIME-Version: 1.0')
    })

    it('should embed the HTML body', () => {
      const html = '<p>Olá, segue proposta comercial</p>'
      const raw = buildRaw(sut, { to: ['a@b.com'], subject: 'S', htmlBody: html })
      expect(decodeMime(raw)).toContain(html)
    })
  })

  describe('multipart/mixed (with attachments)', () => {
    const pdfBuffer = Buffer.from('fake-pdf-content')
    const req: SendEmailRequest = {
      to: ['cliente@empresa.com'],
      subject: 'Proposta',
      htmlBody: '<p>Segue em anexo</p>',
      attachments: [
        { fileName: 'proposta.pdf', mimeType: 'application/pdf', buffer: pdfBuffer },
      ],
    }

    it('should set Content-Type to multipart/mixed', () => {
      const raw = buildRaw(sut, req)
      expect(decodeMime(raw)).toContain('Content-Type: multipart/mixed')
    })

    it('should include the HTML body as first part', () => {
      const raw = buildRaw(sut, req)
      expect(decodeMime(raw)).toContain('<p>Segue em anexo</p>')
    })

    it('should include attachment Content-Type with filename', () => {
      const raw = buildRaw(sut, req)
      const mime = decodeMime(raw)
      expect(mime).toContain('Content-Type: application/pdf; name="proposta.pdf"')
    })

    it('should include Content-Disposition attachment header', () => {
      const raw = buildRaw(sut, req)
      expect(decodeMime(raw)).toContain('Content-Disposition: attachment; filename="proposta.pdf"')
    })

    it('should include Content-Transfer-Encoding: base64', () => {
      const raw = buildRaw(sut, req)
      expect(decodeMime(raw)).toContain('Content-Transfer-Encoding: base64')
    })

    it('should include base64-encoded attachment content', () => {
      const raw = buildRaw(sut, req)
      const expectedBase64 = pdfBuffer.toString('base64')
      expect(decodeMime(raw)).toContain(expectedBase64)
    })

    it('should handle multiple attachments', () => {
      const multi: SendEmailRequest = {
        ...req,
        attachments: [
          { fileName: 'doc1.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf1') },
          { fileName: 'img.png', mimeType: 'image/png', buffer: Buffer.from('png1') },
        ],
      }
      const raw = buildRaw(sut, multi)
      const mime = decodeMime(raw)
      expect(mime).toContain('name="doc1.pdf"')
      expect(mime).toContain('name="img.png"')
    })
  })
})
