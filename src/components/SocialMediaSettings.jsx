import { useState } from 'react';
import { socialMediaManager } from '../social/SocialMediaManager.js';

export default function SocialMediaSettings() {
  const [accounts, setAccounts] = useState(socialMediaManager.getAccounts());
  const [platform, setPlatform] = useState('twitter');
  const [username, setUsername] = useState('');
  const [_showResearch, setShowResearch] = useState(false);

  const addAccount = async () => {
    if (!username) return;
    await socialMediaManager.addAccount(platform, username, { token: 'demo' });
    setAccounts(socialMediaManager.getAccounts());
    setUsername('');
  };

  const testPost = async () => {
    if (accounts.length === 0) return alert('Add an account first');
    const acc = accounts[0];
    const result = await socialMediaManager.post(acc.platform, acc.username, 'Test post from ForgeAI');
    alert(JSON.stringify(result, null, 2));
  };

  const testScrape = async () => {
    const posts = await socialMediaManager.scrapePublicPosts('AI research', 5);
    setShowResearch(true);
    alert(`Scraped ${posts.length} public posts (Research Mode)`);
  };

  return (
    <section className="settings-card">
      <h3>📱 Social Media Automation</h3>
      <p className="setting-help">Manage encrypted accounts and automation for multiple platforms.</p>

      <div style={{ margin: '16px 0' }}>
        <label className="setting-label">Add Account</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ padding: '8px' }}>
            <option value="twitter">Twitter/X</option>
            <option value="linkedin">LinkedIn</option>
            <option value="reddit">Reddit</option>
          </select>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            placeholder="username" 
            style={{ flex: 1, padding: '8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px' }} 
          />
          <button onClick={addAccount}>Add</button>
        </div>
      </div>

      {accounts.length > 0 && (
        <div>
          <strong>Connected Accounts</strong>
          {accounts.map((acc, i) => (
            <div key={i} style={{ fontSize: '13px', padding: '6px 0' }}>
              {acc.platform} • @{acc.username}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={testPost}>Test Post</button>
        <button onClick={testScrape}>Research Mode (Scrape)</button>
      </div>
    </section>
  );
}