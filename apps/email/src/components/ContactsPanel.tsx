import { useState, useCallback } from 'react';

export interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  lastContacted?: string;
}

interface ContactsPanelProps {
  contacts: Contact[];
  onComposeToContact: (email: string) => void;
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
}

export default function ContactsPanel({
  contacts,
  onComposeToContact,
  onAddContact,
  onDeleteContact,
}: ContactsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAdd = useCallback(() => {
    if (newEmail.trim()) {
      onAddContact({
        name: newName.trim() || newEmail.split('@')[0],
        email: newEmail.trim(),
      });
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
    }
  }, [newName, newEmail, onAddContact]);

  return (
    <div className="contacts-panel">
      <div className="contacts-header">
        <span className="contacts-title">👥 Contacts</span>
        <button
          className="contacts-add-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕' : '+'}
        </button>
      </div>

      {showAddForm && (
        <div className="contacts-add-form">
          <input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="contacts-input"
          />
          <input
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="contacts-input"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button className="contacts-save-btn" onClick={handleAdd}>
            Add Contact
          </button>
        </div>
      )}

      <div className="contacts-search">
        <input
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="contacts-search-input"
        />
        {searchQuery && (
          <button className="contacts-search-clear" onClick={() => setSearchQuery('')}>
            ✕
          </button>
        )}
      </div>

      <div className="contacts-list">
        {filteredContacts.length === 0 ? (
          <div className="contacts-empty">
            {searchQuery ? 'No contacts found' : 'No contacts yet'}
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`contacts-item ${selectedContact?.id === contact.id ? 'active' : ''}`}
              onClick={() => setSelectedContact(contact)}
            >
              <div className="contacts-avatar">
                {contact.avatar ? (
                  <img src={contact.avatar} alt={contact.name} />
                ) : (
                  <span>{getInitials(contact.name)}</span>
                )}
              </div>
              <div className="contacts-info">
                <span className="contacts-name">{contact.name}</span>
                <span className="contacts-email">{contact.email}</span>
              </div>
              <div className="contacts-actions">
                <button
                  className="contacts-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComposeToContact(contact.email);
                  }}
                  title="Compose email"
                >
                  ✉️
                </button>
                <button
                  className="contacts-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteContact(contact.id);
                  }}
                  title="Delete contact"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedContact && (
        <div className="contacts-detail">
          <div className="contacts-detail-avatar">
            {getInitials(selectedContact.name)}
          </div>
          <div className="contacts-detail-name">{selectedContact.name}</div>
          <div className="contacts-detail-email">{selectedContact.email}</div>
          {selectedContact.lastContacted && (
            <div className="contacts-detail-last">
              Last contacted: {selectedContact.lastContacted}
            </div>
          )}
          <button
            className="contacts-compose-btn"
            onClick={() => onComposeToContact(selectedContact.email)}
          >
            ✉️ Compose Email
          </button>
        </div>
      )}
    </div>
  );
}
