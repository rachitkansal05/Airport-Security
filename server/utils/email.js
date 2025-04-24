const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.TRANSPORTER_EMAIL,
    pass: process.env.TRANSPORTER_KEY
  }
});

const sendEmployeeCredentials = async (employee) => {
  try {
    const role = employee.role || 'employee';
    let roleDisplay;
    
    if (role === 'admin') {
      roleDisplay = 'Administrator';
    } else if (role === 'police') {
      roleDisplay = 'Police Officer';
    } else {
      roleDisplay = 'Employee';
    }
    
    const message = {
      from: '"Organization Admin" <tname4078@gmail.com>',
      to: employee.email,
      subject: 'Your Account Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Welcome to Our Organization!</h2>
          <p>Hello ${employee.name},</p>
          <p>An account has been created for you in our organization's system. You can use the following credentials to log in:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Email:</strong> ${employee.email}</p>
            <p><strong>Password:</strong> ${employee.password}</p>
            <p><strong>Role:</strong> ${roleDisplay}</p>
          </div>
          ${role === 'admin' ? '<p><strong>Note:</strong> Your account has administrator privileges, giving you access to all system features and management capabilities.</p>' : ''}
          ${role === 'police' ? '<p><strong>Note:</strong> Your account has police officer privileges. You can access your profile and specific security-related features.</p>' : ''}
          <p>Please login at your earliest convenience and change your password for security reasons.</p>
          <p>If you have any questions, please contact your administrator.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(message);
    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

const sendPasswordChangeConfirmation = async (user) => {
  try {
    const message = {
      from: '"Organization Admin" <tname4078@gmail.com>',
      to: user.email,
      subject: 'Password Change Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">Password Changed Successfully</h2>
          <p>Hello ${user.name},</p>
          <p>Your password has been successfully changed.</p>
          <p>If you did not perform this action, please contact your administrator immediately.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(message);
    console.log('Password change confirmation email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password change confirmation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmployeeCredentials,
  sendPasswordChangeConfirmation
};