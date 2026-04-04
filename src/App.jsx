import React from 'react';
import { Provider } from 'react-redux';
import { store } from './Store';
import AppRoutes from './Routes';
import './App.css';
import { ConfigProvider } from 'antd';

const PALETTE = {
  black: "#0B0B0B",
  p1: "#533c2e",
  p2: "#a65430",
  p3: "#f6873a",
  p4: "#fcbc5c",
  p5: "#ffd799",
};

// Custom Ant Design theme to match black + coral branding
const theme = {
  token: {
    colorPrimary: PALETTE.p3,
    borderRadius: 12,
    fontFamily: "'Montserrat', sans-serif",
    colorBgLayout: "#ffffff",
    colorTextHeading: PALETTE.black,
    colorText: PALETTE.black,
    colorBgContainer: "#ffffff",
    colorBorder: "#e2e8f0",
  },
  components: {
    Button: {
      borderRadius: 12,
      fontWeight: 700,
      colorPrimary: PALETTE.p3,
      colorPrimaryHover: PALETTE.p3,
      colorPrimaryActive: PALETTE.p3,
      primaryColor: "#ffffff",
    },
    Card: {
      borderRadiusLG: 20,
      colorBgContainer: "#ffffff",
    },
    Table: {
      headerBg: "#f8fafc",
      headerColor: "#64748b",
      headerSplitColor: 'transparent',
      colorBgContainer: "#ffffff",
      colorText: PALETTE.black,
      borderColor: "#f1f5f9",
    }
  }
};

function App() {
  return (
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <AppRoutes />
      </ConfigProvider>
    </Provider>
  );
}

export default App;
