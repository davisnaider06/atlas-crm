"use client";

import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/components/ui/icons";

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  // Sem DDI (até 11 dígitos), assume Brasil
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}`;
}

type QuickContactActionsProps = {
  phone?: string | null;
  email?: string | null;
  name?: string;
};

/** Atalhos de contato (WhatsApp, ligação, email) para leads e clientes. */
export function QuickContactActions({ phone, email, name }: QuickContactActionsProps) {
  if (!phone && !email) return null;

  return (
    <div className="quick-actions" onClick={(event) => event.stopPropagation()}>
      {phone ? (
        <>
          <a
            className="quick-action whatsapp"
            href={whatsappUrl(phone)}
            target="_blank"
            rel="noreferrer"
            title={`WhatsApp${name ? ` — ${name}` : ""}`}
            aria-label="Abrir conversa no WhatsApp"
          >
            <WhatsAppIcon size={13} />
          </a>
          <a
            className="quick-action"
            href={`tel:${phone.replace(/[^+\d]/g, "")}`}
            title="Ligar"
            aria-label="Ligar"
          >
            <PhoneIcon size={13} />
          </a>
        </>
      ) : null}
      {email ? (
        <a
          className="quick-action"
          href={`mailto:${email}`}
          title="Enviar email"
          aria-label="Enviar email"
        >
          <MailIcon size={13} />
        </a>
      ) : null}
    </div>
  );
}
