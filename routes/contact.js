const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

let cachedTransporter = null;
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;
  const port = Number(process.env.SMTP_PORT) || 465;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port,
    secure: port === 465,
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

router.post("/", async (req, res) => {
  try {
    const { name, email, countryCode = "+91", phone, message = "" } = req.body || {};

    if (!name || !String(name).trim() || /\d/.test(name)) {
      return res.status(400).json({ success: false, message: "Invalid name" });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const recipient = process.env.RECIPIENT_EMAIL || "learntelugunowofficial@gmail.com";

    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(countryCode)} ${escapeHtml(phone)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(message).replace(/\n/g, "<br/>") || "<em>(no message)</em>"}</p>
    `;

    const text =
      `New Contact Form Submission\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${countryCode} ${phone}\n` +
      `Message:\n${message || "(no message)"}\n`;

    await getTransporter().sendMail({
      from: `"Learn Telugu Now" <${process.env.SMTP_USER}>`,
      to: recipient,
      replyTo: email,
      subject: `New contact form message from ${name}`,
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
