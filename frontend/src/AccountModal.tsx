import React, { useState, useRef, type FormEvent } from 'react';
import { Camera, Check, Eye, EyeOff, KeyRound, Lock, Shield, Trash2, Upload, UserCog, UserRound, X, AlertTriangle } from 'lucide-react';

export type User = { id: number; name: string; email: string; avatar?: string | null };

interface AccountModalProps {
  user: User;
  initialTab?: 'profile' | 'password';
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
  apiBase: string;
}

const PRESET_AVATARS = [
  {
    id: 'cyber-sentinel',
    name: 'Cyber Sentinel',
    color: '#3d70c6',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e3c72"/><stop offset="100%" stop-color="%232a5298"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g1)" rx="50"/><path d="M50 20 L75 32 V52 C75 68 50 80 50 80 C50 80 25 68 25 52 V32 Z" fill="%23b7f36b" fill-opacity="0.85" stroke="%23ffffff" stroke-width="3"/><path d="M50 38 L62 50 L50 62 L38 50 Z" fill="%2311191a"/><circle cx="50" cy="50" r="4" fill="%23b7f36b"/></svg>`,
  },
  {
    id: 'neon-guardian',
    name: 'Neon Guardian',
    color: '#8a2be2',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%234a00e0"/><stop offset="100%" stop-color="%238e2de2"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g2)" rx="50"/><polygon points="50,22 78,38 78,70 50,86 22,70 22,38" fill="none" stroke="%2300f2fe" stroke-width="4"/><circle cx="50" cy="54" r="14" fill="%2300f2fe" fill-opacity="0.25" stroke="%23ffffff" stroke-width="3"/><circle cx="50" cy="54" r="6" fill="%2300f2fe"/></svg>`,
  },
  {
    id: 'emerald-shield',
    name: 'Emerald Core',
    color: '#00b09b',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f2027"/><stop offset="100%" stop-color="%23203a43"/></linearGradient></defs><rect width="100" height="100" fill="url(%23g3)" rx="50"/><circle cx="50" cy="50" r="30" fill="none" stroke="%2300ff87" stroke-width="3" stroke-dasharray="6,4"/><path d="M50 26 L68 36 V52 C68 64 50 72 50 72 C50 72 32 64 32 52 V36 Z" fill="%2300ff87" fill-opacity="0.8"/></svg>`,
  },
  {
    id: 'amber-radar',
    name: 'Quantum Pulse',
    color: '#f7971e',
    dataUri: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23f7971e"/><stop offset="100%" stop-color="%23ffd200"/></linearGradient></defs><rect width="100" height="100" fill="%231a1a2e" rx="50"/><circle cx="50" cy="50" r="32" fill="none" stroke="url(%23g4)" stroke-width="3"/><path d="M50 18 V82 M18 50 H82" stroke="%23f7971e" stroke-width="2" stroke-opacity="0.6"/><circle cx="50" cy="50" r="8" fill="%23ffd200"/></svg>`,
  },
];

export default function AccountModal({ user, initialTab = 'profile', onClose, onUserUpdated, apiBase }: AccountModalProps) {
  const [tab, setTab] = useState<'profile' | 'password'>(initialTab);
  
  // Profile State
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<string | null>(user.avatar ?? null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress uploaded image to keep data URL small (<100KB)
  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Please select an image file (PNG, JPG, WebP).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 240;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatar(compressedDataUrl);
          setProfileMsg(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    if (name.trim().length < 2) {
      setProfileMsg({ type: 'error', text: 'Name must be at least 2 characters.' });
      return;
    }
    setProfileBusy(true);
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Failed to update profile.');
      onUserUpdated(data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error updating profile.' });
    } finally {
      setProfileBusy(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 10) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 10 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMsg({ type: 'error', text: 'New password cannot be identical to current password.' });
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await fetch(`${apiBase}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Failed to change password.');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error changing password.' });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-heading">
      <div className="account-modal-shell" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge"><Shield size={14} /> SECURITY PROFILE</span>
            <h2 id="modal-heading">Account Settings</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profile'}
            className={`modal-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => { setTab('profile'); setProfileMsg(null); }}
          >
            <UserCog size={16} />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'password'}
            className={`modal-tab ${tab === 'password' ? 'active' : ''}`}
            onClick={() => { setTab('password'); setPasswordMsg(null); }}
          >
            <KeyRound size={16} />
            <span>Change Password</span>
          </button>
        </div>

        {/* Tab 1: Edit Profile */}
        {tab === 'profile' && (
          <form className="modal-body" onSubmit={handleProfileSubmit}>
            <div className="avatar-editor-section">
              <div className="avatar-preview-wrap">
                <div className="avatar-large-frame">
                  {avatar ? (
                    <img src={avatar} alt="Current avatar" className="avatar-large-img" />
                  ) : (
                    <span className="avatar-large-initial">{name.slice(0, 1).toUpperCase()}</span>
                  )}
                  <button
                    type="button"
                    className="avatar-camera-overlay"
                    title="Upload image"
                    aria-label="Upload profile image"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={18} />
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="avatar-controls">
                <span className="avatar-controls-label">PROFILE PICTURE</span>
                <p className="avatar-controls-sub">Upload a custom photo or pick a CyberShield avatar.</p>
                <div className="avatar-btn-row">
                  <button
                    type="button"
                    className="avatar-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} /> Upload image
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      className="avatar-remove-btn"
                      onClick={() => setAvatar(null)}
                      title="Reset to default initials"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>

                {/* Preset Avatars */}
                <div className="preset-avatars-row">
                  {PRESET_AVATARS.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      className={`preset-avatar-btn ${avatar === preset.dataUri ? 'selected' : ''}`}
                      title={preset.name}
                      onClick={() => setAvatar(preset.dataUri)}
                    >
                      <img src={preset.dataUri} alt={preset.name} />
                      {avatar === preset.dataUri && <span className="preset-check"><Check size={10} /></span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="profile-name">DISPLAY NAME</label>
              <div className="modal-input-wrap">
                <UserRound size={16} />
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder="Your display name"
                />
              </div>
            </div>

            <div className="modal-field">
              <label>WORKSPACE EMAIL</label>
              <div className="modal-input-wrap readonly">
                <span className="readonly-text">{user.email}</span>
                <span className="readonly-badge">LOCAL ONLY</span>
              </div>
              <small className="field-hint">Account emails cannot be altered after creation.</small>
            </div>

            {profileMsg && (
              <div className={`modal-msg ${profileMsg.type}`} role="alert">
                {profileMsg.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={profileBusy}>
                {profileBusy ? 'Saving changes…' : 'Save profile'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {tab === 'password' && (
          <form className="modal-body" onSubmit={handlePasswordSubmit}>
            <div className="password-banner-card">
              <div className="password-banner-icon">
                <Lock size={26} strokeWidth={1.5} />
              </div>
              <div>
                <b>Secure Password Update</b>
                <p>Passwords are hashed locally with salted PBKDF2-SHA256 (420,000 rounds).</p>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="current-pw">CURRENT PASSWORD</label>
              <div className="modal-input-wrap">
                <Lock size={16} />
                <input
                  id="current-pw"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="new-pw">NEW PASSWORD</label>
              <div className="modal-input-wrap">
                <KeyRound size={16} />
                <input
                  id="new-pw"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={10}
                  maxLength={128}
                  required
                  placeholder="Minimum 10 characters"
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowNew(!showNew)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <small className={`field-hint ${newPassword.length >= 10 ? 'valid' : ''}`}>
                {newPassword.length >= 10 ? '✓ Password meets 10-character requirement' : 'Requires at least 10 characters.'}
              </small>
            </div>

            <div className="modal-field">
              <label htmlFor="confirm-new-pw">CONFIRM NEW PASSWORD</label>
              <div className="modal-input-wrap">
                <Check size={16} />
                <input
                  id="confirm-new-pw"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={10}
                  maxLength={128}
                  required
                  placeholder="Re-enter your new password"
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <small className="field-hint error">Passwords do not match.</small>
              )}
            </div>

            {passwordMsg && (
              <div className={`modal-msg ${passwordMsg.type}`} role="alert">
                {passwordMsg.type === 'success' ? <Check size={15} /> : <AlertTriangle size={15} />}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={passwordBusy}>
                {passwordBusy ? 'Updating password…' : 'Update password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
