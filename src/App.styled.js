import styled, { createGlobalStyle } from 'styled-components';
import { AppBar, Tabs, Tab, IconButton } from '@mui/material';

export const AppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #23272f;
  min-height: 0;
  overflow: hidden;
  /* Custom scrollbar for dark mode */
  &::-webkit-scrollbar, *::-webkit-scrollbar {
    width: 10px;
    height: 10px;
    background: #23272f;
  }
  &::-webkit-scrollbar-thumb, *::-webkit-scrollbar-thumb {
    background: #3a3f4b;
    border-radius: 8px;
    border: 2px solid #23272f;
  }
  &::-webkit-scrollbar-thumb:hover, *::-webkit-scrollbar-thumb:hover {
    background: #50576a;
  }
  &::-webkit-scrollbar-track, *::-webkit-scrollbar-track {
    background: #23272f;
    border-radius: 8px;
  }
`;

export const StyledAppBar = styled(AppBar)`
  background: transparent;
  box-shadow: none;
`;

export const StyledTabs = styled(Tabs)`
  background: #2d3340;
  border-bottom: 1px solid #333;
  min-height: 40px;
`;

export const StyledTab = styled(Tab)`
  text-transform: none;
  min-width: 120px;
  max-width: 200px;
  border-radius: 8px 8px 0 0;
  background: #2d3340;
  margin-right: 4px;
  padding: 6px 12px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-weight: 500;
  color: #f5f6fa;
  &.Mui-selected {
    background: #23272f;
    box-shadow: 0 2px 4px rgba(0,0,0,0.18);
    font-weight: bold;
    color: #42a5f5;
  }
  &:hover {
    background: #313743;
    box-shadow: 0 2px 4px rgba(0,0,0,0.12);
  }
`;

export const TabCloseButton = styled.span`
  margin-left: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #bfc6d1;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
  &:hover {
    background: #42a5f5;
    color: #fff;
  }
`;

export const AddTabButton = styled(IconButton)`
  min-width: 48px;
  width: 48px;
  height: 48px;
  border-radius: 8px 8px 0 0;
  background: #2d3340;
  margin-right: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  margin-top: 0;
  padding: 0;
  color: #bfc6d1;
  &:hover {
    background: #313743;
    box-shadow: 0 2px 4px rgba(0,0,0,0.12);
    color: #42a5f5;
  }
`;

export const GlobalScrollbarStyle = createGlobalStyle`
  /* Ensure Autocomplete popups use the dark-mode scrollbar */
  .MuiAutocomplete-popper .MuiPaper-root {
    scrollbar-color: #3a3f4b #23272f;
    scrollbar-width: thin;
  }
  .MuiAutocomplete-popper .MuiPaper-root::-webkit-scrollbar {
    width: 10px;
    background: #23272f;
  }
  .MuiAutocomplete-popper .MuiPaper-root::-webkit-scrollbar-thumb {
    background: #3a3f4b;
    border-radius: 8px;
    border: 2px solid #23272f;
  }
  .MuiAutocomplete-popper .MuiPaper-root::-webkit-scrollbar-thumb:hover {
    background: #50576a;
  }
  .MuiAutocomplete-popper .MuiPaper-root::-webkit-scrollbar-track {
    background: #23272f;
    border-radius: 8px;
  }
`; 