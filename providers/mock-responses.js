/**
 * Author  : Anil Kalisetti
 * File    : providers/mock-responses.js
 * Purpose : Ordered reply rules for the deterministic mock provider.
 *
 * Rule format
 *   when.query  : RegExp tested against the `query` variable of the test.
 *   when.prompt : (optional) RegExp tested against the full rendered prompt, used to
 *                 check that earlier conversation turns were actually passed along.
 *   reply       : Text returned. $1, $2 ... insert capture groups from `when.query`.
 *
 * The FIRST matching rule wins, so keep specific rules above generic ones.
 * Replies model what a well-behaved assistant would say. Real-model behaviour is
 * measured with the local and cloud profiles, not here.
 */
'use strict';

const REFUSAL = "I'm sorry, but I can't help with that request.";

module.exports = [
  // ---------------------------------------------------------------- Edge inputs
  { id: 'edge-empty-or-blank', when: { query: /^\s*$/ }, reply: 'Hi! How can I help you today?' },
  {
    id: 'edge-question-mark',
    when: { query: /^\?+$/ },
    reply: "I'm not sure what you're asking. Could you tell me a bit more?",
  },

  // ------------------------------------------- Conversation memory (travel booking)
  // Context-aware rules come first: they only match when earlier turns are in the prompt.
  {
    id: 'conv-change-destination',
    when: { query: /Phoenix/i, prompt: /Chicago/i },
    reply: 'Updated: Chicago to Phoenix on Friday morning. Anything else I can help with?',
  },
  {
    id: 'conv-morning-with-context',
    when: { query: /morning flight/i, prompt: /Chicago/i },
    reply:
      'Morning departures from Chicago to Denver on Friday are available. ' +
      'Checked-bag fees vary by fare, so please check the fare rules.',
  },
  {
    id: 'conv-morning-without-context',
    when: { query: /morning flight/i },
    reply: 'Which route and date would you like to book?',
  },
  {
    id: 'conv-initial-booking',
    when: { query: /fly from Chicago to Denver/i },
    reply:
      'Happy to help with Chicago to Denver on Friday. ' +
      'Would you prefer a morning or afternoon departure?',
  },
  {
    id: 'conv-bag-fee',
    when: { query: /checked-bag fee/i },
    reply: 'Checked-bag fees vary by fare. Which route are you flying?',
  },

  // ------------------------------------------------------- Chained tests (storeOutputAs)
  { id: 'chain-classify', when: { query: /Classify this ticket/i }, reply: 'Email' },
  {
    id: 'chain-troubleshoot',
    when: { query: /troubleshooting steps for a '([^']+)' issue/i },
    reply:
      '1. Sign out of $1 and sign back in.\n' +
      '2. Clear the cached credentials in Windows Credential Manager.\n' +
      '3. Recreate the Outlook profile.',
  },
  {
    id: 'chain-ticket-summary',
    when: { query: /one-line ticket summary/i },
    reply:
      'Outlook repeatedly prompts for credentials after a Windows update; ' +
      'advised sign-out, credential cache clear and profile rebuild.',
  },
  { id: 'chain-symptom', when: { query: /Name the main symptom/i }, reply: 'Headache' },
  {
    id: 'chain-self-care',
    when: { query: /self-care tips for (.+?) and one sign/i },
    reply:
      'Tips for $1: drink water regularly and rest in a quiet, dark room. ' +
      'See a doctor if the $1 is sudden and severe or comes with vision changes.',
  },

  // ------------------------------------------------- Sensitive information and attacks
  {
    id: 'sensitive-full-card-number',
    when: { query: /full card number/i },
    reply:
      "For your security I can't read out a full card number. You can view it in the " +
      'mobile app after signing in, or call the number on the back of your card.',
  },
  {
    id: 'sensitive-customer-pastes-card',
    when: { query: /card is 4242/i },
    reply:
      "Thanks, but please don't share full card numbers in chat. " +
      'I can help check the decline using only the last four digits.',
  },
  {
    id: 'sensitive-pin',
    when: { query: /\bPIN\b/i },
    reply:
      "I can't share or look up a PIN. You can reset it at an ATM or in the mobile app " +
      'after you verify your identity.',
  },
  {
    id: 'sensitive-ssn',
    when: { query: /\bSSN\b/i },
    reply:
      "For your security, please don't share your Social Security number in chat. " +
      "I can't store it or repeat it.",
  },
  {
    id: 'sensitive-other-patient-results',
    when: { query: /lab results/i },
    reply:
      "I can't share another person's health information. " +
      'Patients can view their own results by signing in to the patient portal.',
  },
  {
    id: 'sensitive-insulin-dose',
    when: { query: /insulin/i },
    reply:
      "I can't advise on changing a dose. Please contact your doctor or pharmacist right " +
      'away, and call emergency services if you feel very unwell.',
  },
  {
    id: 'sensitive-vpn-password',
    when: { query: /VPN password/i },
    reply:
      "I can't share anyone's credentials. She can reset her own password through the " +
      'self-service portal after verifying her identity.',
  },
  {
    id: 'sensitive-internal-token',
    when: { query: /internal token|api key/i },
    reply: "I can't share internal credentials or configuration details.",
  },
  {
    id: 'sensitive-system-prompt',
    when: { query: /system prompt/i },
    reply:
      "I'm sorry, but I can't share my internal instructions. " +
      'How can I help with your account today?',
  },
  {
    id: 'sensitive-system-prompt-french',
    when: { query: /invite système/i },
    reply:
      'Je ne peux pas partager mes instructions internes. ' +
      'Comment puis-je vous aider avec vos comptes ou vos cartes ?',
  },
  { id: 'sensitive-jailbreak-roleplay', when: { query: /FreeBot/i }, reply: REFUSAL },
  {
    id: 'sensitive-fake-document',
    when: { query: /fake pay stub/i },
    reply: "I'm sorry, but I can't help with creating false documents.",
  },
  {
    id: 'sensitive-indirect-injection',
    when: { query: /Summarise this customer email/i },
    reply: 'The customer asks to update their mailing address.',
  },
  {
    id: 'sensitive-one-time-code',
    when: { query: /one-time code/i },
    reply: "I can't read out or confirm one-time codes. Our staff will never ask for them.",
  },

  // ------------------------------- Helpful answers (must not be over-refused)
  {
    id: 'helpful-debit-vs-credit',
    when: { query: /difference between a debit card/i },
    reply:
      'A debit card spends money already in your account, while a credit card ' +
      'borrows money that you repay later.',
  },
  {
    id: 'helpful-ibuprofen-side-effects',
    when: { query: /side effects/i },
    reply:
      'Common side effects include stomach upset, heartburn and nausea. ' +
      'Talk to your pharmacist or doctor if you have concerns.',
  },
  {
    id: 'helpful-self-service-reset',
    when: { query: /reset my own password/i },
    reply:
      'Open the self-service password portal, choose Forgot password and ' +
      'verify with your registered device.',
  },
  {
    id: 'helpful-verify-identity',
    when: { query: /verify my identity/i },
    reply:
      'You can verify your identity with your phone banking passcode or by answering ' +
      'the security questions you set up earlier.',
  },

  // ------------------------------------------------------------ Negative / edge cases
  {
    id: 'edge-sql-injection-text',
    when: { query: /DROP TABLE/i },
    reply:
      "I'm not sure I understood that. I can help with questions about accounts, " +
      'cards and transfers.',
  },
  {
    id: 'edge-html-script',
    when: { query: /<script>/i },
    reply: 'I can help with your refund. Could you share your order number?',
  },
  {
    id: 'edge-spanish-withdrawal-limit',
    when: { query: /límite de retiro/i },
    reply:
      'El límite de retiro diario en cajeros depende de su tipo de cuenta. ' +
      'Puede verlo en la app o consultarnos por teléfono.',
  },
  {
    id: 'edge-typos',
    when: { query: /wher is my ordr/i },
    reply:
      "I'm sorry about the delay. I can help you track your order. " +
      'Could you share your order number?',
  },
  {
    id: 'edge-malformed-json-input',
    when: { query: /"amount": 50/ },
    reply: '{"intent":"unknown","entities":{}}',
  },
  {
    id: 'edge-off-topic',
    when: { query: /recipe/i },
    reply:
      'I can only help with banking questions such as accounts, cards and transfers. ' +
      'Is there anything like that I can help with?',
  },
  {
    id: 'edge-long-input',
    when: { query: /charged twice/i },
    reply:
      'You were charged twice for the same order and are asking for a refund ' +
      'of the duplicate charge.',
  },

  // ------------------------------------------ Policy answers used by assertion tests
  {
    id: 'python-after-60-days',
    when: { query: /after 60 days/i },
    reply:
      'Our standard return window is 30 days from delivery, so a return after 60 days ' +
      'is not eligible for a full refund. I can check for any exceptions.',
  },
  {
    id: 'python-guarantee-refund',
    when: { query: /guarantee me a refund/i },
    reply:
      "I can't guarantee an outcome, but returns within 30 days of delivery are " +
      'eligible for a full refund once the item is inspected.',
  },
  { id: 'assert-equals-ready', when: { query: /reply with only the word READY/i }, reply: 'READY' },
  {
    id: 'faq-return-window',
    when: { query: /return window|days do I have to return/i },
    reply: 'You can return most items within 30 days of delivery for a full refund.',
  },
  {
    id: 'faq-shipping-time',
    when: { query: /how long.*shipping|shipping.*take/i },
    reply: 'Standard shipping usually takes 3-5 business days.',
  },
  {
    id: 'faq-gift-cards',
    when: { query: /gift card/i },
    reply: 'Gift cards are available from $10 to $200. Gift cards are non-refundable.',
  },
  {
    id: 'faq-international-shipping',
    when: { query: /ship internationally/i },
    reply: 'We currently ship to the United States and Canada.',
  },
  {
    id: 'assert-defective-return',
    when: { query: /defective item/i },
    reply:
      'Print the prepaid return label, ship the item back, and your refund is ' +
      'issued after inspection.',
  },
  {
    id: 'assert-greeting-with-order-number',
    when: { query: /Start your reply with the word Hello/i },
    reply: 'Hello! Could you share your order number so I can look into this?',
  },
  {
    id: 'assert-order-number-format',
    when: { query: /ORD- followed by 8 digits/i },
    reply: 'For example: ORD-12345678.',
  },
  {
    id: 'assert-short-policy',
    when: { query: /no more than 40 words/i },
    reply:
      'Most items can be returned within 30 days of delivery. Items must be unused and in ' +
      'original packaging. Start a return from your order page and print the prepaid label.',
  },
  {
    id: 'assert-json-ticket',
    when: { query: /Return only a JSON object/i },
    reply: '{"category":"damaged_item","priority":"high"}',
  },
  {
    id: 'assert-short-greeting',
    when: { query: /short greeting/i },
    reply: 'Hello! How can I help you today?',
  },
  {
    id: 'assert-track-order',
    when: { query: /How can I track my order/i },
    reply:
      'Open your order page and select Track package, or share your order number ' +
      'and I can help.',
  },
  {
    id: 'assert-plain-text',
    when: { query: /Say hello in plain text/i },
    reply: 'Hello! How can I help?',
  },
  {
    id: 'performance-support-hours',
    when: { query: /support hours/i },
    reply: 'Our support team is available 8am to 8pm Eastern, Monday to Saturday.',
  },

  // --------------------------------------------------------------- Dataset examples
  {
    id: 'dataset-wire-transfer',
    when: { query: /wire transfer/i },
    reply:
      'Domestic wire transfers usually arrive the same business day if they are sent ' +
      'before the daily cut-off.',
  },
  {
    id: 'dataset-lost-debit-card',
    when: { query: /lose my debit card/i },
    reply: 'Freeze the card in the mobile app right away and contact us to order a replacement.',
  },
  {
    id: 'dataset-flu-shot',
    when: { query: /flu shot/i },
    reply:
      'Most adults are advised to get a flu shot every year. ' +
      'Ask your pharmacist or doctor about your situation.',
  },
  {
    id: 'dataset-cold-vs-flu',
    when: { query: /cold and the flu/i },
    reply:
      'Flu symptoms usually come on suddenly and are more intense, with fever and body ' +
      'aches, while colds are milder and develop gradually.',
  },
  {
    id: 'dataset-carry-on',
    when: { query: /carry-on size limit/i },
    reply: 'Carry-on bags up to 22 x 14 x 9 inches (56 x 36 x 23 cm) are allowed.',
  },
  {
    id: 'dataset-flight-change',
    when: { query: /change my flight/i },
    reply: 'Yes, changes are allowed up to 24 hours before departure; a fare difference may apply.',
  },
  {
    id: 'dataset-card-types',
    when: { query: /What is an? (\w+) card/i },
    reply: 'A $1 card is a payment card issued by a bank for purchases and cash withdrawals.',
  },
  {
    id: 'dataset-order-lookup',
    when: { query: /order (ORD-\d{8})/i },
    reply: 'I found order $1. It is in transit and expected within 2 business days.',
  },
];
