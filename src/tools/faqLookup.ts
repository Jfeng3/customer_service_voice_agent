// FAQ lookup tool

interface FAQItem {
  question: string
  answer: string
  topic: string
}

// Mock FAQ data
const faqDatabase: FAQItem[] = [
  {
    question: 'How do I return an item?',
    answer:
      'To return an item: 1) Log into your account, 2) Go to Order History, 3) Select the item to return, 4) Print the return label, 5) Ship the item within 14 days. Refunds are processed within 5-7 business days after we receive the item.',
    topic: 'returns',
  },
  {
    question: 'Where is my order?',
    answer:
      'You can track your order by: 1) Logging into your account, 2) Going to Order History, 3) Clicking "Track Order" next to your order. You\'ll also receive email updates with tracking information.',
    topic: 'shipping',
  },
  {
    question: 'How do I cancel my order?',
    answer:
      'Orders can be cancelled within 1 hour of placement. After that, you\'ll need to wait for delivery and then initiate a return. To cancel: Go to Order History and click "Cancel Order" if the option is available.',
    topic: 'orders',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, and Google Pay. All payments are processed securely with SSL encryption.',
    topic: 'payment',
  },
  {
    question: 'How do I contact customer support?',
    answer:
      'You can reach us through: 1) Live chat on our website (24/7), 2) Email at support@example.com, 3) Phone at 1-800-XXX-XXXX (9am-6pm EST). Average response time is under 2 hours.',
    topic: 'support',
  },
  {
    question: 'Do you offer international shipping?',
    answer:
      'Yes! We ship to over 50 countries. International shipping rates and delivery times vary by destination. Customs duties and taxes may apply and are the responsibility of the recipient.',
    topic: 'shipping',
  },
  {
    question: 'How do I reset my password?',
    answer:
      'To reset your password: 1) Click "Forgot Password" on the login page, 2) Enter your email address, 3) Check your email for a reset link, 4) Create a new password. The link expires in 24 hours.',
    topic: 'account',
  },
]

export async function faqLookup(
  topic: string,
  onProgress?: (progress: number, message?: string) => void
): Promise<{ faqs: FAQItem[] }> {
  onProgress?.(20, 'Searching FAQs...')
  await sleep(200)

  const topicLower = topic.toLowerCase()

  onProgress?.(50, 'Finding relevant answers...')
  await sleep(200)

  // Find matching FAQs
  const results = faqDatabase.filter((faq) => {
    const questionLower = faq.question.toLowerCase()
    const answerLower = faq.answer.toLowerCase()
    const faqTopic = faq.topic.toLowerCase()

    return (
      questionLower.includes(topicLower) ||
      answerLower.includes(topicLower) ||
      faqTopic.includes(topicLower) ||
      topicLower.includes(faqTopic)
    )
  })

  onProgress?.(80, 'Preparing response...')
  await sleep(100)

  onProgress?.(100, 'FAQ lookup complete')

  return { faqs: results.slice(0, 3) }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
