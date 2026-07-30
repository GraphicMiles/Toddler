import { useState } from 'react';
import { MessageCircle, Search, Share2 } from 'lucide-react';
import { socialMediaManager } from '../social/SocialMediaManager.js';
import DropdownMenu from './DropdownMenu.jsx';

export default function SocialMediaSettings() {
  const [accounts, setAccounts] = useState(socialMediaManager.getAccounts());
  const [platform, setPlatform] = useState('twitter');
  const [username, setUsername] = useState('');
  const [_showResearch, setShowResearch] = useState(false);

  const addAccount = async () => {
    if (!username.trim()) return;
    try {
      await socialMediaManager.addAccount(platform, username.trim(), { token: 'demo' });
      setAccounts(socialMediaManager.getAccounts());
      setUsername('');
    } catch (error) {
      alert(`Could not add account: ${error.message}`);
    }
  };

  const testPost = async () => {
    if (accounts.length === 0) return alert('Add an account first');
    try {
      const acc = accounts[0];
      const result = await socialMediaManager.post(acc.platform, acc.username, 'Test post from ForgeAI');
      alert(JSON.stringify(result, null, 2));
    } catch (error) {
      alert(`Test post failed: ${error.message}`);
    }
  };

  const testScrape = async () => {
    try {
      const posts = await socialMediaManager.scrapePublicPosts('AI research', 5);
      setShowResearch(true);
      alert(`Scraped ${posts.length} public posts (Research Mode)`);
    } catch (error) {
      alert(`Research failed: ${error.message}`);
    }
  };

  return (
    <section className="settings-card">
      <h3><Share2 size={16} /> Social media automation</h3>
      <p className="setting-help first">Manage account labels and test research/posting flows. Real posting requires native experimental support.</p>

      <div className="settings-two-col">
        <div className="setting-field">
          <label className="setting-label" htmlFor="social-platform">Platform</label>
          <DropdownMenu
            value={platform}
            onChange={setPlatform}
            label="Platform"
            options={[
              { value: 'twitter', label: 'Twitter/X' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'reddit', label: 'Reddit' },
            ]}
          />
        </div>
        <div className="setting-field">
          <label className="setting-label" htmlFor="social-username">Username</label>
          <div className="setting-row">
            <input id="social-username" value={username} onChange={event => setUsername(event.target.value)} placeholder="username" />
            <button onClick={addAccount}>Add</button>
          </div>
        </div>
      </div>

      {accounts.length > 0 && (
        <div className="settings-list">
          {accounts.map(account => (
            <div className="settings-list-item" key={`${account.platform}:${account.username}`}>
              <MessageCircle size={14} />
              <span><strong>{account.platform}</strong><small>@{account.username}</small></span>
            </div>
          ))}
        </div>
      )}

      <div className="setting-row wrap">
        <button onClick={testPost}><Share2 size={14} /> Test post</button>
        <button onClick={testScrape}><Search size={14} /> Research mode</button>
      </div>
    </section>
  );
}
