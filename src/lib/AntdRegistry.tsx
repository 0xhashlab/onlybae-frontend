// src/lib/AntdRegistry.tsx
'use client';

import React from 'react';
import { StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider, App, theme } from 'antd';
import 'antd/dist/reset.css';

export default function AntdRegistry({ children }: { children: React.ReactNode }) {
  return (
    <StyleProvider hashPriority="high">
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#EAB308',
            colorBgContainer: '#18181B',
            colorBgElevated: '#18181B',
            colorBgLayout: '#09090B',
            colorText: '#FAFAFA',
            colorTextSecondary: '#A1A1AA',
            colorTextTertiary: '#71717A',
            colorBorder: '#27272A',
            colorBorderSecondary: '#27272A',
            borderRadius: 8,
            fontFamily: 'inherit',
          },
          components: {
            Button: {
              controlHeight: 32,
              controlHeightLG: 40,
              controlHeightSM: 24,
            },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}