# Integracao da pagina de vendas com o Atlas CRM

Coloque o arquivo `atlas-crm-lead-capture.js` na mesma pasta do HTML da pagina de vendas.

No HTML, adicione esta linha logo antes de `</body>`, depois do script atual da pagina:

```html
<script src="./atlas-crm-lead-capture.js"></script>
```

No arquivo `atlas-crm-lead-capture.js`, ajuste:

```js
const CRM_API_URL = "http://localhost:8081";
const CRM_PUBLIC_LEAD_KEY = "troque-por-uma-chave-da-landing-page";
```

A chave precisa ser a mesma configurada no CRM:

```env
ATLASCRM_PUBLIC_LEAD_KEY=troque-por-uma-chave-da-landing-page
```

O script usa os IDs que ja existem no HTML enviado:

- `diagnostic-form`
- `diagnostic-submit`
- `diagnostic-name`
- `diagnostic-company`
- `diagnostic-phone`
- `diagnostic-notes`
- `lead-form`

Quando o lead envia o formulario, o script registra no CRM via `POST /public/leads` e depois abre o WhatsApp com o contexto da conversa.
