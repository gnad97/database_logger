import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemButton, ListItemText, DialogActions, IconButton, Autocomplete, Alert, CircularProgress } from '@mui/material';
import { FormContainer, ButtonRow } from './ConnectionForm.styled';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

const loadSettingsFromMain = async () => {
  try {
    const list = await window.api.loadSettings();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

const ConnectionForm = ({
  formState, onFormChange, onConnect,
  dbList, setDbList,
  selectedDb, setSelectedDb,
  loading, setLoading,
  error, setError
}) => {
  const [openLoad, setOpenLoad] = useState(false);
  const [settings, setSettings] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadSettingsFromMain().then(list => {
      if (!cancelled) setSettings(list);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async () => {
    setError('');
    setDbList([]);
    setSelectedDb('');
    if (formState.dbType === 'mongodb' && formState.uri) {
      setLoading(true);
      try {
        const res = await window.api.connect(formState.dbType, { uri: formState.uri });
        setLoading(false);
        if (res.success) {
          setDbList(res.databases);
        } else {
          setError(res.error || 'Connection failed');
        }
      } catch (e) {
        setLoading(false);
        setError('Connection failed');
      }
    }
  };

  const handleInputChange = (field) => (e) => {
    onFormChange({ ...formState, [field]: e.target.value });
  };

  const handleOpenLoad = async () => {
    const list = await loadSettingsFromMain();
    setSettings(list);
    setOpenLoad(true);
  };
  const handleCloseLoad = () => setOpenLoad(false);

  const handleSelectSetting = (setting) => {
    onFormChange(setting);
    setOpenLoad(false);
  };

  const handleStartViewLog = () => {
    let info = { ...formState };
    if (formState.dbType === 'mongodb') {
      info.uri = formState.uri;
      info.database = selectedDb;
    } else {
      info.database = selectedDb;
    }
    if (formState.name) {
      info.settingName = formState.name;
    }
    onConnect(formState.dbType, info);
  };

  // Determine if the Connect button should be enabled
  const isConnectEnabled = (() => {
    if (loading) return false;
    if (!formState.dbType) return false;
    if (formState.dbType === 'mongodb') {
      return !!formState.uri;
    }
    if (['postgresql', 'sql'].includes(formState.dbType)) {
      return !!formState.host && !!formState.database;
    }
    return false;
  })();

  return (
    <FormContainer>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Database Type</InputLabel>
        <Select
          value={formState.dbType}
          onChange={handleInputChange('dbType')}
          label="Database Type"
          disabled={dbList.length > 0}
        >
          <MenuItem value="mongodb">MongoDB</MenuItem>
        </Select>
      </FormControl>

      {/* Show the rest of the form fields right below the dropdown if dbType is selected */}
      {formState.dbType && (
        <>
          {formState.dbType === 'mongodb' ? (
            <>
              <TextField
                fullWidth
                label="MongoDB URI"
                value={formState.uri}
                onChange={handleInputChange('uri')}
                sx={{ mb: dbList.length === 0 ? 2 : 0 }}
                disabled={dbList.length > 0}
              />
              {/* Show database dropdown and Start View Log button after connect */}
              {dbList.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  <Autocomplete
                    options={dbList}
                    value={selectedDb}
                    onChange={(_, v) => setSelectedDb(v)}
                    renderInput={(params) => <TextField {...params} label="Select Database" sx={{ mb: 2 }} fullWidth />}
                    fullWidth
                    disableClearable
                    autoHighlight
                    autoSelect
                    filterSelectedOptions
                  />
                  <ButtonRow>
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{ width: '100%' }}
                      disabled={!selectedDb}
                      onClick={handleStartViewLog}
                    >
                      {loading ? <CircularProgress size={22} color="inherit" /> : 'Start View Log'}
                    </Button>
                  </ButtonRow>
                </Box>
              )}
            </>
          ) : (
            <>
              <TextField
                fullWidth
                label="Host"
                value={formState.host}
                onChange={handleInputChange('host')}
                sx={{ mb: 2 }}
                disabled={dbList.length > 0}
              />
              <TextField
                fullWidth
                label="Port"
                value={formState.port}
                onChange={handleInputChange('port')}
                sx={{ mb: 2 }}
                disabled={dbList.length > 0}
              />
              <TextField
                fullWidth
                label="Username"
                value={formState.username}
                onChange={handleInputChange('username')}
                sx={{ mb: 2 }}
                disabled={dbList.length > 0}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={formState.password}
                onChange={handleInputChange('password')}
                sx={{ mb: 2 }}
                disabled={dbList.length > 0}
              />
              <TextField
                fullWidth
                label="Database"
                value={formState.database}
                onChange={handleInputChange('database')}
                sx={{ mb: 2 }}
                disabled={dbList.length > 0}
              />
            </>
          )}
        </>
      )}

      {/* Always show the Connect and Load Setting buttons at the bottom */}
      {dbList.length === 0 && (
        <ButtonRow style={{ marginTop: 16 }}>
          <Button variant="contained" onClick={handleSubmit} disabled={!isConnectEnabled} sx={{ width: 140 }}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Connect'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={handleOpenLoad}
            disabled={loading}
            sx={{ width: 210 }}
          >
            Load Setting
          </Button>
        </ButtonRow>
      )}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Dialog open={openLoad} onClose={handleCloseLoad}>
        <DialogTitle>Select a saved configuration</DialogTitle>
        <DialogContent>
          <List>
            {settings.length === 0 && (
              <ListItem><ListItemText primary="No configuration found" /></ListItem>
            )}
            {settings.map((setting, idx) => (
              <ListItem disablePadding key={idx}>
                <ListItemButton onClick={() => handleSelectSetting(setting)}>
                  <ListItemText
                    primary={setting.name || `Setting ${idx + 1}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLoad}>Close</Button>
        </DialogActions>
      </Dialog>
    </FormContainer>
  );
};

export default ConnectionForm;