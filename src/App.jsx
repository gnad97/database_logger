import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, Tab, IconButton, Tooltip, Box } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import ConnectionForm from './components/ConnectionForm';
import LogViewer from './components/LogViewer';
import { AppContainer, StyledAppBar, StyledTabs, StyledTab, TabCloseButton, AddTabButton, GlobalScrollbarStyle } from './App.styled';
import SettingManagerDialog from './components/SettingManagerDialog';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#42a5f5',
    },
    background: {
      default: '#23272f',
      paper: '#2d3340',
    },
    text: {
      primary: '#f5f6fa',
      secondary: '#bfc6d1',
    },
    error: {
      main: '#ef5350',
    },
    success: {
      main: '#66bb6a',
    },
    warning: {
      main: '#ffa726',
    },
    info: {
      main: '#29b6f6',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const TIMEZONE_KEY = 'db_log_viewer_timezone_offset';
const MAX_LOGS_KEY = 'db_log_viewer_max_logs';
const DEFAULT_MAX_LOGS = 5000;
const MIN_MAX_LOGS = 1;
const MAX_MAX_LOGS = 100000;

const clampMaxLogs = (n) => {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v)) return DEFAULT_MAX_LOGS;
  return Math.max(MIN_MAX_LOGS, Math.min(MAX_MAX_LOGS, v));
};

const computeTabTitle = (dbType, info) => {
  if (!info) return dbType || '';
  if (info.settingName) {
    return info.database ? `${info.settingName} - ${info.database}` : info.settingName;
  }
  if (info.database) return `${dbType} - ${info.database}`;
  return dbType || '';
};

const createEmptyTab = (id) => ({
  id,
  title: '',
  dbType: null,
  connectionInfo: null,
  formState: { dbType: '', uri: '', host: '', port: '', username: '', password: '', database: '' },
  dbList: [],
  selectedDb: '',
  loading: false,
  error: '',
  collections: [],
  logs: [],
  logError: '',
  selectedOps: [],
  selectedCols: [],
  searchId: '',
  paused: false,
  pausedSnapshot: null,
  logSeq: 0,
  pausedAtSeq: 0,
});

const TabMongoSubscription = ({ tabId, dbType, connectionInfo, onLog, onError }) => {
  const uri = connectionInfo?.uri;
  const database = connectionInfo?.database;
  useEffect(() => {
    if (dbType !== 'mongodb' || !uri || !database) return;
    const channel = `db-log-event-${tabId}`;
    window.api.watchLog(uri, database, channel);
    const offLog = window.api.onLog(channel, log => onLog(tabId, log));
    const offErr = window.api.onLogError(channel, msg => onError(tabId, msg));
    return () => {
      window.api.unsubscribeLog(channel);
      offLog();
      offErr();
    };
  }, [tabId, dbType, uri, database, onLog, onError]);
  return null;
};

const App = () => {
  const [tabs, setTabs] = useState([createEmptyTab(1)]);
  const [activeTab, setActiveTab] = useState(0);
  const nextIdRef = useRef(2);
  const [openSettingManager, setOpenSettingManager] = useState(false);
  const [timezoneOffset, setTimezoneOffset] = useState(() => {
    const raw = localStorage.getItem(TIMEZONE_KEY);
    return raw !== null ? Number(raw) : 0;
  });
  const [maxLogs, setMaxLogs] = useState(() => {
    const raw = localStorage.getItem(MAX_LOGS_KEY);
    return raw !== null ? clampMaxLogs(raw) : DEFAULT_MAX_LOGS;
  });
  const maxLogsRef = useRef(maxLogs);
  useEffect(() => { maxLogsRef.current = maxLogs; }, [maxLogs]);

  useEffect(() => {
    setTabs(prev => {
      let changed = false;
      const next = prev.map(t => {
        if (!t.logs || t.logs.length <= maxLogs) return t;
        changed = true;
        return { ...t, logs: t.logs.slice(t.logs.length - maxLogs) };
      });
      return changed ? next : prev;
    });
  }, [maxLogs]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        const tabIndex = parseInt(event.key) - 1;
        if (tabIndex >= 0 && tabIndex < tabs.length) {
          event.preventDefault();
          setActiveTab(tabIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabs.length]);

  const handleLog = useCallback((tabId, log) => {
    setTabs(tabs => {
      const idx = tabs.findIndex(t => t.id === tabId);
      if (idx === -1) return tabs;
      const cap = clampMaxLogs(maxLogsRef.current);
      const prev = tabs[idx].logs || [];
      const seq = (tabs[idx].logSeq || 0) + 1;
      const annotated = { ...log, _uid: seq };
      const overflow = prev.length + 1 - cap;
      const nextLogs = overflow > 0 ? [...prev.slice(overflow), annotated] : [...prev, annotated];
      const updated = [...tabs];
      updated[idx] = { ...updated[idx], logs: nextLogs, logSeq: seq };
      return updated;
    });
  }, []);

  const handleError = useCallback((tabId, errMsg) => {
    setTabs(tabs => {
      const idx = tabs.findIndex(t => t.id === tabId);
      if (idx === -1) return tabs;
      const updated = [...tabs];
      updated[idx] = { ...updated[idx], logError: errMsg };
      return updated;
    });
  }, []);

  const addTab = () => {
    const newTab = createEmptyTab(nextIdRef.current++);
    setTabs([...tabs, newTab]);
    setActiveTab(tabs.length);
  };

  const removeTab = (index) => {
    if (tabs.length === 1) {
      setTabs([createEmptyTab(nextIdRef.current++)]);
      setActiveTab(0);
      return;
    }
    const newTabs = tabs.filter((_, i) => i !== index);
    setTabs(newTabs);
    if (activeTab >= newTabs.length) {
      setActiveTab(newTabs.length - 1);
    } else if (activeTab > index) {
      setActiveTab(activeTab - 1);
    }
  };

  const handleConnect = async (index, dbType, connectionInfo) => {
    const tabId = tabs[index]?.id;
    if (tabId == null) return;
    let collections = [];
    if (dbType === 'mongodb' && connectionInfo.uri && connectionInfo.database) {
      try {
        const names = await window.api.listCollections(
          connectionInfo.uri,
          connectionInfo.database
        );
        collections = Array.isArray(names) ? names : [];
      } catch {
        collections = [];
      }
    }
    setTabs(prev => prev.map(t => t.id !== tabId ? t : {
      ...t,
      dbType,
      connectionInfo,
      title: computeTabTitle(dbType, connectionInfo),
      collections,
      logs: [],
      logError: '',
      selectedOps: [],
      selectedCols: [],
      searchId: '',
      paused: false,
      pausedSnapshot: null,
      logSeq: 0,
      pausedAtSeq: 0,
      ...((dbType === 'postgresql' || dbType === 'sql') && {
        dbList: [],
        loading: false,
        error: '',
        selectedDb: '',
      }),
    }));
  };

  const updateFormState = (index, newFormState) => {
    setTabs(prev => prev.map((t, i) => i === index ? { ...t, formState: newFormState } : t));
  };

  const updateTabState = (index, patch) => {
    setTabs(tabs => {
      const updated = [...tabs];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const clearTabLog = (tabIdx) => {
    setTabs(tabs => {
      const updated = [...tabs];
      if (updated[tabIdx]) updated[tabIdx] = {
        ...updated[tabIdx],
        logs: [],
        paused: false,
        pausedSnapshot: null,
        logSeq: 0,
        pausedAtSeq: 0,
      };
      return updated;
    });
  };

  const togglePauseTab = (tabIdx) => {
    setTabs(tabs => {
      const updated = [...tabs];
      const t = updated[tabIdx];
      if (!t) return tabs;
      if (t.paused) {
        updated[tabIdx] = { ...t, paused: false, pausedSnapshot: null, pausedAtSeq: 0 };
      } else {
        updated[tabIdx] = { ...t, paused: true, pausedSnapshot: t.logs || [], pausedAtSeq: t.logSeq || 0 };
      }
      return updated;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalScrollbarStyle />
      {tabs.map(tab => (
        <TabMongoSubscription
          key={tab.id}
          tabId={tab.id}
          dbType={tab.dbType}
          connectionInfo={tab.connectionInfo}
          onLog={handleLog}
          onError={handleError}
        />
      ))}
      <AppContainer>
        <StyledAppBar position="static" color="transparent" elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: 48 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', height: 48 }}>
              <Tooltip title="Manage Settings">
                <IconButton onClick={() => setOpenSettingManager(true)} sx={{ mr: 1, height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SettingsIcon fontSize="medium" />
                </IconButton>
              </Tooltip>
            </Box>
            <StyledTabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ flex: 1 }}
            >
              {tabs.map((tab, index) => (
                <StyledTab
                  key={tab.id}
                  label={
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {tab.title || `Tab ${index + 1}`}
                      <TabCloseButton
                        role="button"
                        aria-label="Close tab"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTab(index);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </TabCloseButton>
                    </span>
                  }
                />
              ))}
              <AddTabButton onClick={addTab}>
                <AddIcon fontSize="small" />
              </AddTabButton>
            </StyledTabs>
          </Box>
        </StyledAppBar>
        <div style={{ flex: 1, minHeight: 0, padding: '24px 24px 0 24px', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
          {tabs[activeTab] && (
            tabs[activeTab].dbType ? (
              <LogViewer
                connectionInfo={tabs[activeTab].connectionInfo}
                dbType={tabs[activeTab].dbType}
                collections={tabs[activeTab].collections}
                logs={tabs[activeTab].logs}
                logError={tabs[activeTab].logError}
                onClearLog={() => clearTabLog(activeTab)}
                selectedOps={tabs[activeTab].selectedOps}
                setSelectedOps={selectedOps => updateTabState(activeTab, { selectedOps })}
                selectedCols={tabs[activeTab].selectedCols}
                setSelectedCols={selectedCols => updateTabState(activeTab, { selectedCols })}
                searchId={tabs[activeTab].searchId}
                setSearchId={searchId => updateTabState(activeTab, { searchId })}
                timezoneOffset={timezoneOffset}
                paused={tabs[activeTab].paused}
                pausedSnapshot={tabs[activeTab].pausedSnapshot}
                newSincePause={tabs[activeTab].paused ? Math.max(0, (tabs[activeTab].logSeq || 0) - (tabs[activeTab].pausedAtSeq || 0)) : 0}
                onTogglePause={() => togglePauseTab(activeTab)}
              />
            ) : (
              <ConnectionForm
                formState={tabs[activeTab].formState}
                onFormChange={(newFormState) => updateFormState(activeTab, newFormState)}
                onConnect={(dbType, connectionInfo) => handleConnect(activeTab, dbType, connectionInfo)}
                dbList={tabs[activeTab].dbList}
                selectedDb={tabs[activeTab].selectedDb}
                loading={tabs[activeTab].loading}
                error={tabs[activeTab].error}
                setDbList={dbs => updateTabState(activeTab, { dbList: dbs })}
                setSelectedDb={db => updateTabState(activeTab, { selectedDb: db })}
                setLoading={val => updateTabState(activeTab, { loading: val })}
                setError={val => updateTabState(activeTab, { error: val })}
              />
            )
          )}
        </div>
        <SettingManagerDialog open={openSettingManager} onClose={() => setOpenSettingManager(false)}
          timezoneOffset={timezoneOffset}
          setTimezoneOffset={offset => {
            setTimezoneOffset(offset);
            localStorage.setItem(TIMEZONE_KEY, String(offset));
          }}
          maxLogs={maxLogs}
          setMaxLogs={value => {
            const next = clampMaxLogs(value);
            setMaxLogs(next);
            localStorage.setItem(MAX_LOGS_KEY, String(next));
          }}
        />
      </AppContainer>
    </ThemeProvider>
  );
};

export default App;