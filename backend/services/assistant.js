// ==============================================================================
// Asistentul pentru părinți (chat). Interfața și endpoint-ul sunt gata;
// modelul AI se conectează în funcția replyWithModel() de mai jos.
// ==============================================================================

const config = require('../config');

// Punct de integrare: primește istoricul conversației și contextul părintelui,
// întoarce textul răspunsului. Folosește config.aiApiKey (AI_API_KEY din .env).
// eslint-disable-next-line no-unused-vars
async function replyWithModel(messages, context) {
  return null;
}

async function reply(messages, context) {
  if (!config.aiApiKey) {
    return {
      configured: false,
      reply: 'Asistentul AI nu este încă configurat. Până atunci, poți căuta curse din pagina „Caută” sau publica una din „Publică”.',
    };
  }
  const text = await replyWithModel(messages, context);
  return {
    configured: true,
    reply: text || 'Nu am putut genera un răspuns acum. Încearcă din nou.',
  };
}

module.exports = { reply };
