import './globals.css';

export const metadata = {
  title: 'Lamp 4.0',
  description: 'A modern IoT Lamp Controller',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="container flex-col items-center">
          {children}
        </main>
      </body>
    </html>
  );
}
