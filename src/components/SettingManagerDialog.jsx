import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, TextField, MenuItem, Box, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const loadSettingsFromMain = async () => {
  try {
    const list = await window.api.loadSettings();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};
const persistSettings = async (settings) => {
  await window.api.saveSettings(settings);
};

const emptySetting = {
  name: '',
  dbType: '',
  uri: '',
  host: '',
  port: '',
  username: '',
  password: '',
  database: '',
};

const SettingManagerDialog = ({ open, onClose, timezoneOffset = 0, setTimezoneOffset, maxLogs = 5000, setMaxLogs }) => {
  const [settings, setSettings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySetting);
  const [isNew, setIsNew] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [tzInput, setTzInput] = useState(String(timezoneOffset));

  useEffect(() => {
    setTzInput(String(timezoneOffset));
  }, [timezoneOffset]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadSettingsFromMain().then(list => {
      if (!cancelled) setSettings(list);
    });
    return () => { cancelled = true; };
  }, [open]);

  const handleEdit = (idx) => {
    setEditing(idx);
    setForm(settings[idx]);
    setIsNew(false);
  };
  const handleDelete = async (idx) => {
    const newSettings = settings.filter((_, i) => i !== idx);
    setSettings(newSettings);
    try {
      await persistSettings(newSettings);
      setSaveError('');
    } catch (e) {
      setSaveError(e?.message || 'Cannot save settings');
    }
    if (editing === idx) {
      setEditing(null);
      setForm(emptySetting);
    }
  };
  const handleAddNew = () => {
    setEditing(null);
    setForm(emptySetting);
    setIsNew(true);
  };
  const handleFormChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };
  const handleSave = async () => {
    if (!form.name || !form.dbType) return;
    let newSettings;
    if (isNew) {
      newSettings = [...settings, form];
    } else if (editing !== null) {
      newSettings = settings.map((s, i) => (i === editing ? form : s));
    } else {
      return;
    }
    setSettings(newSettings);
    try {
      await persistSettings(newSettings);
      setSaveError('');
    } catch (e) {
      setSaveError(e?.message || 'Cannot save settings');
      return;
    }
    setEditing(null);
    setForm(emptySetting);
    setIsNew(false);
  };
  const handleCancelEdit = () => {
    setEditing(null);
    setForm(emptySetting);
    setIsNew(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{
        sx: {
          background: '#2d3340',
          color: '#f5f6fa',
        }
      }}
    >
      <DialogTitle sx={{ color: '#f5f6fa', background: '#2d3340' }}>Manage Connection Configurations</DialogTitle>
      <DialogContent sx={{ background: '#2d3340', color: '#f5f6fa',
        '&::-webkit-scrollbar': {
          width: '10px',
          background: '#2d3340',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#3a3f4b',
          borderRadius: '8px',
          border: '2px solid #2d3340',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#50576a',
        },
        '&::-webkit-scrollbar-track': {
          background: '#23272f',
          borderRadius: '8px',
        },
      }}>
        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError('')}>{saveError}</Alert>
        )}
        <Box sx={{ mb: 3, p: 2, border: '1px solid #333', borderRadius: 2, background: '#23272f', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
          <TextField
            fullWidth
            type="text"
            label="Global display timezone (UTC offset, e.g.: 0, -7, 7)"
            value={tzInput}
            onChange={e => {
              const val = e.target.value;
              if (!/^-?\d{0,2}$/.test(val)) return;
              setTzInput(val);
              if (val === '' || val === '-') return;
              const num = Number(val);
              if (Number.isFinite(num) && num >= -23 && num <= 23) {
                setTimezoneOffset(num);
              }
            }}
            InputLabelProps={{ style: { color: '#bfc6d1' } }}
            InputProps={{ style: { color: '#f5f6fa' } }}
            helperText="Enter the hour offset from UTC. E.g.: Vietnam is 7, US is -7, default is 0."
          />
        </Box>
        <Box sx={{ mb: 3, p: 2, border: '1px solid #333', borderRadius: 2, background: '#23272f', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
          <TextField
            fullWidth
            type="text"
            label="Max logs per tab"
            value={maxLogs}
            onChange={e => {
              const val = e.target.value;
              if (!/^\d{0,6}$/.test(val) || val === '') return;
              const num = Number(val);
              if (num >= 1 && num <= 100000) setMaxLogs(num);
            }}
            InputLabelProps={{ style: { color: '#bfc6d1' } }}
            InputProps={{ style: { color: '#f5f6fa' } }}
            helperText="Max recent logs kept per tab (1–100000). Default: 5000. Older logs are dropped first."
          />
        </Box>
        <List sx={{ background: 'transparent', color: '#f5f6fa' }}>
          {settings.length === 0 && (
            <ListItem><ListItemText primary="No configuration found" /></ListItem>
          )}
          {settings.map((setting, idx) => (
            <ListItem key={idx} selected={editing === idx} sx={{ background: editing === idx ? '#23272f' : 'transparent', borderRadius: 2 }}>
              <ListItemText
                primary={setting.name}
                secondary={
                  setting.dbType === 'mongodb'
                    ? `MongoDB: ${setting.uri}`
                    : `${setting.dbType}: ${setting.host}:${setting.port} / ${setting.database}`
                }
                primaryTypographyProps={{ color: '#f5f6fa' }}
                secondaryTypographyProps={{ color: '#bfc6d1' }}
              />
              <ListItemSecondaryAction>
                <IconButton edge="end" onClick={() => handleEdit(idx)} sx={{ color: '#42a5f5' }}><EditIcon /></IconButton>
                <IconButton edge="end" onClick={() => handleDelete(idx)} sx={{ color: '#ef5350' }}><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 2, mb: 1 }}>
          <Button startIcon={<AddIcon />} onClick={handleAddNew} variant="outlined" sx={{ color: '#42a5f5', borderColor: '#42a5f5' }}>Add new configuration</Button>
        </Box>
        {(editing !== null || isNew) && (
          <Box sx={{ p: 2, border: '1px solid #333', borderRadius: 2, background: '#23272f', mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
            <TextField
              fullWidth
              label="Configuration Name"
              value={form.name}
              onChange={handleFormChange('name')}
              sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: '#bfc6d1' } }}
              InputProps={{ style: { color: '#f5f6fa' } }}
            />
            <TextField
              select
              fullWidth
              label="Database Type"
              value={form.dbType}
              onChange={handleFormChange('dbType')}
              sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: '#bfc6d1' } }}
              InputProps={{ style: { color: '#f5f6fa' } }}
            >
              <MenuItem value="mongodb">MongoDB</MenuItem>
            </TextField>
            {form.dbType === 'mongodb' ? (
              <TextField
                fullWidth
                label="MongoDB URI"
                value={form.uri}
                onChange={handleFormChange('uri')}
                sx={{ mb: 2 }}
                InputLabelProps={{ style: { color: '#bfc6d1' } }}
                InputProps={{ style: { color: '#f5f6fa' } }}
              />
            ) : form.dbType ? (
              <>
                <TextField
                  fullWidth
                  label="Host"
                  value={form.host}
                  onChange={handleFormChange('host')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Port"
                  value={form.port}
                  onChange={handleFormChange('port')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Username"
                  value={form.username}
                  onChange={handleFormChange('username')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={handleFormChange('password')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
                <TextField
                  fullWidth
                  label="Database"
                  value={form.database}
                  onChange={handleFormChange('database')}
                  sx={{ mb: 2 }}
                  InputLabelProps={{ style: { color: '#bfc6d1' } }}
                  InputProps={{ style: { color: '#f5f6fa' } }}
                />
              </>
            ) : null}
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.dbType} sx={{ background: '#42a5f5', color: '#fff' }}>
                Save
              </Button>
              <Button variant="outlined" onClick={handleCancelEdit} sx={{ color: '#bfc6d1', borderColor: '#bfc6d1' }}>Cancel</Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ background: '#2d3340', color: '#f5f6fa' }}>
        <Button onClick={onClose} sx={{ color: '#42a5f5' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingManagerDialog; 