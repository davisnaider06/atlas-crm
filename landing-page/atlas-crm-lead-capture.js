(function () {
  const CRM_API_URL = "http://localhost:8081";
  const CRM_PUBLIC_LEAD_KEY = "troque-por-uma-chave-da-landing-page";
  const WHATSAPP_NUMBER = "5512991015266";

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function getValue(id) {
    const field = document.getElementById(id);
    return field ? String(field.value || "").trim() : "";
  }

  function openWhatsApp(message) {
    const whatsappUrl = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  async function sendLeadToCrm(payload) {
    const response = await fetch(CRM_API_URL + "/public/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Atlas-Public-Key": CRM_PUBLIC_LEAD_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(function () {
        return null;
      });
      throw new Error((body && body.error) || "Falha ao enviar lead para o CRM.");
    }

    return response.json();
  }

  function buildDiagnosticMessage(state) {
    return [
      "Ola, Atlas!",
      "",
      "Novo diagnostico gratuito solicitado",
      "",
      "Segmento: " + (state.segmento || "-"),
      "Maior dor: " + (state.dor || "-"),
      "Tentativa anterior: " + (state.tentativa || "-"),
      "Momento atual: " + (state.momento || "-"),
      "Faturamento: " + (state.faturamento || "-"),
      "",
      "Nome: " + (state.nome || "-"),
      "Empresa: " + (state.empresa || "-"),
      "WhatsApp: " + (state.telefone || "-"),
      "Observacoes: " + (state.observacoes || "Nenhuma")
    ].join("\n");
  }

  function buildLeadModalMessage(data) {
    return [
      "Ola, Atlas!",
      "",
      "Novo diagnostico solicitado",
      "",
      "Nome: " + data.name,
      "E-mail: " + data.email,
      "Telefone: " + data.phone,
      "Dor do negocio: " + data.pain
    ].join("\n");
  }

  function enhanceDiagnosticForm() {
    const form = document.getElementById("diagnostic-form");
    if (!form) return;

    const submit = document.getElementById("diagnostic-submit");
    const thankyou = document.getElementById("diagnostic-thankyou");
    const progressFill = document.getElementById("diagnostic-progress-fill");
    const progressLabel = document.getElementById("diagnostic-progress-label");
    const steps = Array.from(form.querySelectorAll(".diagnostic-step"));
    const state = {};

    form.querySelectorAll(".diagnostic-option").forEach(function (option) {
      option.addEventListener("click", function () {
        if (option.dataset.field) {
          state[option.dataset.field] = option.dataset.value || "";
        }
      });
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (submit && submit.disabled) return;

      state.nome = getValue("diagnostic-name");
      state.empresa = getValue("diagnostic-company");
      state.telefone = getValue("diagnostic-phone");
      state.observacoes = getValue("diagnostic-notes");

      const message = buildDiagnosticMessage(state);

      if (submit) {
        submit.disabled = true;
        submit.textContent = "Enviando...";
      }

      try {
        const result = await sendLeadToCrm({
          name: state.nome,
          phone: state.telefone,
          source: "Pagina de Vendas - Diagnostico",
          companyName: state.empresa,
          monthlyRevenue: state.faturamento,
          urgency: state.momento,
          interest: state.dor,
          notes: state.observacoes,
          metadata: {
            segmento: state.segmento || "",
            dor: state.dor || "",
            tentativa: state.tentativa || "",
            momento: state.momento || "",
            faturamento: state.faturamento || "",
            whatsappDigits: onlyDigits(state.telefone)
          }
        });

        openWhatsApp(message + "\n\nCRM Lead ID: " + result.leadId);
        steps.forEach(function (step) {
          step.classList.remove("active");
        });
        if (progressFill) progressFill.style.width = "100%";
        if (progressLabel) progressLabel.textContent = "✓";
        if (thankyou) thankyou.classList.add("active");
      } catch (error) {
        console.error(error);
        openWhatsApp(message + "\n\nObs: envio automatico ao CRM falhou no navegador.");
        alert("Nao conseguimos registrar no CRM agora, mas abrimos o WhatsApp para continuar o atendimento.");
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Agendar diagnostico";
        }
      }
    }, true);
  }

  function enhanceLeadModalForm() {
    const form = document.getElementById("lead-form");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();

      const formData = new FormData(form);
      const data = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        pain: String(formData.get("pain") || "").trim()
      };
      const message = buildLeadModalMessage(data);
      const submit = form.querySelector("button[type='submit']");

      if (submit) {
        submit.disabled = true;
        submit.textContent = "Enviando...";
      }

      try {
        const result = await sendLeadToCrm({
          name: data.name,
          email: data.email,
          phone: data.phone,
          source: "Pagina de Vendas - Modal",
          urgency: "Quero conversar",
          interest: data.pain,
          notes: data.pain,
          metadata: {
            form: "lead-modal",
            whatsappDigits: onlyDigits(data.phone)
          }
        });

        openWhatsApp(message + "\n\nCRM Lead ID: " + result.leadId);
      } catch (error) {
        console.error(error);
        openWhatsApp(message + "\n\nObs: envio automatico ao CRM falhou no navegador.");
        alert("Nao conseguimos registrar no CRM agora, mas abrimos o WhatsApp para continuar o atendimento.");
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = "Enviar para WhatsApp";
        }
      }
    }, true);
  }

  window.addEventListener("DOMContentLoaded", function () {
    enhanceDiagnosticForm();
    enhanceLeadModalForm();
  });
})();
