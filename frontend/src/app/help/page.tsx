'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, Phone, Mail, MessageSquare, QrCode } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'How do I submit a complaint?',
    answer: 'Go to "New Complaint" from your dashboard. You can submit via text, upload an image/video, or record a voice note. The platform accepts complaints in English, Hindi, Marathi, Tamil, Telugu, and Kannada.',
  },
  {
    question: 'How does AI classify my complaint?',
    answer: 'Our AI pipeline uses a fine-tuned DistilBERT model trained on municipal complaint data. It predicts your complaint\'s category (e.g. Road Damage, Garbage) and assigns a confidence score. If confidence is below 80%, a human officer manually reviews the routing.',
  },
  {
    question: 'What is a Master Incident?',
    answer: 'When multiple citizens report the same issue (e.g. 5 people report the same broken streetlight), our AI groups them into a single "Master Incident" using semantic similarity. Your complaint remains individually tracked, but all evidence is combined to increase priority.',
  },
  {
    question: 'How do I track my complaint status?',
    answer: 'From your Citizen Dashboard, click on any complaint to see a full timeline: Submitted → Verified → Assigned → In Progress → Resolved. You\'ll also receive SMS/email notifications at each stage.',
  },
  {
    question: 'What is the SLA (Service Level Agreement)?',
    answer: 'SLA is the maximum time a department has to resolve your complaint. Garbage: 12 hours, Streetlight: 24 hours, Water Leakage: 48 hours, Road Damage: 7 days. If overdue, it is automatically escalated to the Department Head, then the Municipal Commissioner.',
  },
  {
    question: 'How do I appeal a rejected complaint?',
    answer: 'On the complaint detail page, click "Submit Appeal" and provide your reason. The appeal is sent to the System Administrator for review and reassignment.',
  },
  {
    question: 'Is my personal data safe?',
    answer: 'Yes. Phone numbers and emails are encrypted using AES-256-GCM. Officers only see masked contact information. AI models receive PII-stripped text only. Full details are in the Privacy Center.',
  },
  {
    question: 'Can I submit a complaint anonymously?',
    answer: 'Yes. On the complaint form, toggle "Submit Anonymously". Your identity is stored server-side (required for notifications) but is not displayed to officers or in public feeds.',
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <HelpCircle className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Help Center</h1>
          <p className="text-xs text-slate-400">Frequently asked questions, contact information, and platform guidance.</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/50 flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6 text-cyan-400" />
          </div>
          <p className="text-sm font-bold text-white">Live Chat Support</p>
          <p className="text-xs text-slate-400">Connect with a support officer during 9 AM – 6 PM IST.</p>
          <button className="w-full py-2 glass-button rounded-xl text-xs font-bold text-white">Start Chat</button>
        </div>
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-950 border border-green-800/50 flex items-center justify-center mx-auto">
            <Phone className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-sm font-bold text-white">Helpline Number</p>
          <p className="text-xs text-slate-400">Call our dedicated grievance helpline.</p>
          <a href="tel:18001800180" className="block w-full py-2 bg-green-950 border border-green-800 rounded-xl text-xs font-bold text-green-300 text-center">
            1800-1800-180 (Toll-Free)
          </a>
        </div>
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-800/50 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-bold text-white">Email Support</p>
          <p className="text-xs text-slate-400">Send us your query — response within 24 hours.</p>
          <a href="mailto:support@communityredressal.gov" className="block w-full py-2 bg-purple-950 border border-purple-800 rounded-xl text-xs font-bold text-purple-300 text-center">
            support@crp.gov.in
          </a>
        </div>
      </div>

      {/* QR Code Tracking */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
          <QrCode className="w-14 h-14 text-slate-900" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">QR Code Complaint Tracking</h3>
          <p className="text-xs text-slate-400">
            Each complaint gets a unique QR code. Scan it anytime to instantly view the current status, assigned officer, and resolution timeline — no login required.
            QR codes are generated automatically on complaint submission and included in your confirmation SMS.
          </p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
        {FAQ_ITEMS.map((faq, i) => (
          <div key={i} className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/30 transition-colors"
            >
              <span className="text-sm font-semibold text-white pr-4">{faq.question}</span>
              {openFaq === i ? (
                <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              )}
            </button>
            {openFaq === i && (
              <div className="px-5 pb-5">
                <p className="text-xs text-slate-400 leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
