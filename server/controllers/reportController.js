const { sendReportWithAttachment } = require('../utils/email');

const sendReportEmail = async (req, res) => {
  try {
    const { pdfBase64, filename } = req.body;
    const user = req.user;

    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF data is required' });
    }

    // Clean any prefix like 'data:application/pdf;filename=report.pdf;base64,'
    const base64Data = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
    // Convert base64 to Buffer
    const pdfBuffer = Buffer.from(base64Data, "base64");

    await sendReportWithAttachment(
      user.name, 
      user.email, 
      pdfBuffer, 
      filename || 'AzureThreatMap_Report.pdf'
    );

    res.status(200).json({ message: 'Report email sent successfully' });
  } catch (err) {
    console.error('Error sending report email:', err);
    res.status(500).json({ error: 'Failed to send report email' });
  }
};

module.exports = { sendReportEmail };
