import styled from 'styled-components';

export const ViewerContainer = styled.div`
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0 0 0 0;
  background: #23272f;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1.5px 4px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #f5f6fa;
`;

export const LogBox = styled.div`
  background: #2d3340;
  border-radius: 10px 10px 0 0;
  flex: 1 1 0;
  min-height: 0;
  max-height: none;
  height: 100%;
  padding: 0;
  font-family: 'Fira Mono', 'Consolas', monospace;
  font-size: 15px;
  color: #f5f6fa;
  box-shadow: 0 1.5px 4px rgba(0,0,0,0.04);
  box-sizing: border-box;
  overflow: visible;
  /* Custom scrollbar for dark mode */
  &::-webkit-scrollbar {
    width: 10px;
    background: #2d3340;
  }
  &::-webkit-scrollbar-thumb {
    background: #3a3f4b;
    border-radius: 8px;
    border: 2px solid #2d3340;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #50576a;
  }
  &::-webkit-scrollbar-track {
    background: #23272f;
    border-radius: 8px;
  }
`;

export const StickyTableContainer = styled.div`
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
  table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
  }
  thead th, thead td, thead .MuiTableCell-root {
    position: sticky;
    top: 0;
    z-index: 2;
    background: #2d3340;
    color: #f5f6fa;
    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  }
  /* Scrollbar visible only on hover */
  &::-webkit-scrollbar {
    width: 10px;
    background: #2d3340;
    opacity: 0;
    transition: opacity 0.2s;
  }
  &:hover::-webkit-scrollbar {
    opacity: 1;
  }
  &::-webkit-scrollbar-thumb {
    background: #3a3f4b;
    border-radius: 8px;
    border: 2px solid #2d3340;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #50576a;
  }
  &::-webkit-scrollbar-track {
    background: #23272f;
    border-radius: 8px;
  }
`; 