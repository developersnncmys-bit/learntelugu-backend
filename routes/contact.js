const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

let cachedTransporter = null;
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port,
    secure: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  return cachedTransporter;
};

const escapeHtml = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^\d{10}$/.test(String(phone).replace(/\s/g, ""));

const FORM_META = {
  demo: { heading: "New Demo Booking", subjectPrefix: "New demo booking from" },
  instructor: { heading: "New Instructor Application", subjectPrefix: "New instructor application from" },
  contact: { heading: "New Contact Form Submission", subjectPrefix: "New contact form message from" },
};

const EXTRA_FIELDS = {
  demo: [
    ["course", "Course"],
    ["country", "Country"],
    ["demoDate", "Demo Date"],
    ["demoTime", "Demo Time"],
    ["timeZone", "Time Zone"],
    ["referralSource", "Referral Source"],
  ],
  instructor: [
    ["qualification", "Qualification"],
    ["subjects", "Subjects"],
    ["experience", "Teaching Experience"],
    ["onlineTeaching", "Online Teaching"],
    ["languages", "Languages"],
    ["preferredTime", "Preferred Time"],
    ["currentLocation", "Current Location"],
  ],
};

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const {
      name,
      email,
      countryCode = "+91",
      phone,
      message = "",
      formType = "contact",
    } = body;

    if (!name || !String(name).trim() || /\d/.test(name)) {
      return res.status(400).json({ success: false, message: "Invalid name" });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const meta = FORM_META[formType] || FORM_META.contact;
    const extras = (EXTRA_FIELDS[formType] || [])
      .map(([key, label]) => [label, body[key]])
      .filter(([, value]) => value && String(value).trim());

    const rows = [
      ["Name", name],
      ["Email", email],
      ["Phone", `${countryCode} ${phone}`],
      ...extras,
    ];

    const htmlRows = rows
      .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
      .join("\n      ");
    const messageHtml = escapeHtml(message).replace(/\n/g, "<br/>") || "<em>(no message)</em>";
    const html = `
      <h2>${escapeHtml(meta.heading)}</h2>
      ${htmlRows}
      <p><strong>Message:</strong></p>
      <p>${messageHtml}</p>
    `;

    const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    const text =
      `${meta.heading}\n\n` +
      `${textRows}\n` +
      `Message:\n${message || "(no message)"}\n`;

    const recipient = process.env.RECIPIENT_EMAIL || "learntelugunowofficial@gmail.com";

    await getTransporter().sendMail({
      from: `"Learn Telugu Now" <${process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: email,
      subject: `${meta.subjectPrefix} ${name}`,
      text,
      html,
    });

    return res.json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error("Contact send error:", err);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

module.exports = router;
