// ==========================================================================
// utils/mailer.js — sends transactional emails via SMTP (works with Gmail,
// Resend, SendGrid, or any other SMTP provider — just fill in .env).
//
// If SMTP_HOST/SMTP_USER/SMTP_PASS are not set, sendMail() logs a warning
// and does nothing instead of crashing — so the rest of the site keeps
// working perfectly even before email is configured.
// ==========================================================================

const nodemailer = require("nodemailer");

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

async function sendMail({ to, subject, html }) {
  if (!isConfigured()) {
    console.log("[mailer] SMTP yapılandırılmamış, e-posta gönderilmedi. Alıcı olacaktı:", to, "| Konu:", subject);
    return { sent: false, reason: "not_configured" };
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Studify" <' + process.env.SMTP_USER + '>',
      to, subject, html
    });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] Gönderim hatası:", err.message);
    return { sent: false, reason: err.message };
  }
}

// ---- Templates (per-language) --------------------------------------------
// Matches the exact wording the founder specified: short and clear.

const TEMPLATES = {
  approved: {
    tr: { subject: "Başvurunuz Onaylandı 🎉", body: "Uğurlar! Başvurunuz admin tərəfindən qəbul edildi. Sizə uğurlar diləyirik! Hər hansı probleminiz olsa, admin-ə yaza bilərsiniz." },
    az: { subject: "Müraciətiniz Qəbul Edildi 🎉", body: "Uğurlar! Müraciətiniz admin tərəfindən qəbul edildi. Sizə uğurlar diləyirik! Hər hansı probleminiz olsa, admin-ə yaza bilərsiniz." },
    en: { subject: "Your Application Has Been Approved 🎉", body: "Congratulations! Your application has been approved by our team. We wish you success! If you have any issues, you can message the admin." },
    ru: { subject: "Ваша заявка одобрена 🎉", body: "Поздравляем! Ваша заявка одобрена администратором. Желаем успехов! По любым вопросам вы можете написать администратору." },
    ka: { subject: "თქვენი განაცხადი დამტკიცდა 🎉", body: "გილოცავთ! თქვენი განაცხადი დამტკიცებულია ადმინისტრატორის მიერ. გისურვებთ წარმატებებს! ნებისმიერი პრობლემის შემთხვევაში მიმართეთ ადმინისტრატორს." },
    es: { subject: "Tu Solicitud Ha Sido Aprobada 🎉", body: "¡Felicidades! Tu solicitud ha sido aprobada por nuestro equipo. ¡Te deseamos éxito! Si tienes algún problema, puedes escribir al administrador." },
    fr: { subject: "Votre Candidature a Été Approuvée 🎉", body: "Félicitations ! Votre candidature a été approuvée par notre équipe. Nous vous souhaitons du succès ! En cas de problème, vous pouvez contacter l'administrateur." },
    zh: { subject: "您的申请已获批准 🎉", body: "恭喜！您的申请已获管理员批准。祝您成功！如有任何问题，可以给管理员留言。" },
    de: { subject: "Ihre Bewerbung Wurde Genehmigt 🎉", body: "Herzlichen Glückwunsch! Ihre Bewerbung wurde vom Administrator genehmigt. Wir wünschen Ihnen viel Erfolg! Bei Problemen können Sie den Administrator kontaktieren." }
  },
  rejected: {
    tr: { subject: "Başvurunuz Hakkında", body: "Başvurunuz admin tərəfindən rədd edildi." },
    az: { subject: "Müraciətiniz Haqqında", body: "Müraciətiniz admin tərəfindən rədd edildi." },
    en: { subject: "About Your Application", body: "Your application was not approved by our team." },
    ru: { subject: "О вашей заявке", body: "Ваша заявка была отклонена администратором." },
    ka: { subject: "თქვენი განაცხადის შესახებ", body: "თქვენი განაცხადი უარყოფილია ადმინისტრატორის მიერ." },
    es: { subject: "Sobre Tu Solicitud", body: "Tu solicitud fue rechazada por nuestro equipo." },
    fr: { subject: "À Propos de Votre Candidature", body: "Votre candidature a été refusée par notre équipe." },
    zh: { subject: "关于您的申请", body: "很遗憾，您的申请未获管理员批准。" },
    de: { subject: "Zu Ihrer Bewerbung", body: "Ihre Bewerbung wurde vom Administrator abgelehnt." }
  }
};

function wrapHtml(bodyText) {
  return '<div style="font-family:Arial,sans-serif; max-width:480px; margin:0 auto; padding:24px; color:#0d1b3e;">' +
    '<h2 style="color:#1a56db; margin:0 0 16px;">Studify</h2>' +
    '<p style="font-size:15px; line-height:1.6;">' + bodyText + '</p>' +
    '<p style="font-size:12px; color:#5c6680; margin-top:30px;">© 2026 Studify</p>' +
  '</div>';
}

async function sendApplicationResultEmail(toEmail, lang, approved) {
  const set = approved ? TEMPLATES.approved : TEMPLATES.rejected;
  const t = set[lang] || set.tr;
  return sendMail({ to: toEmail, subject: t.subject, html: wrapHtml(t.body) });
}

module.exports = { sendMail, sendApplicationResultEmail, isConfigured };
