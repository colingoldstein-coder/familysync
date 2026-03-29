export default function Privacy() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px', color: '#e0e0e0' }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: March 2026</em></p>

      <h2>What We Collect</h2>
      <p>FamilySync collects the minimum information needed to provide the service:</p>
      <ul>
        <li><strong>Account info:</strong> Name, email address, and a hashed password.</li>
        <li><strong>Family data:</strong> Tasks, help requests, and family membership created by you and your family members.</li>
      </ul>

      <h2>How We Use Your Data</h2>
      <ul>
        <li>To authenticate you and provide the FamilySync service.</li>
        <li>To send invitation emails when you invite family members.</li>
      </ul>
      <p>We do not sell, rent, or share your personal data with third parties for marketing purposes.</p>

      <h2>Data Storage and Security</h2>
      <p>Your data is stored in encrypted databases. Passwords are hashed using bcrypt and are never stored in plain text. All communication uses HTTPS encryption.</p>

      <h2>Children&rsquo;s Privacy</h2>
      <p>FamilySync is designed for family use. Child accounts can only be created by a parent or guardian through the invitation system. We do not knowingly collect information from children under 13 without parental consent through our invitation flow.</p>

      <h2>Your Rights</h2>
      <p>You can request deletion of your account and all associated data by contacting us. Family admins can remove family members at any time.</p>

      <h2>Contact</h2>
      <p>For privacy questions, contact us at <strong>privacy@familysync.app</strong>.</p>
    </div>
  );
}
