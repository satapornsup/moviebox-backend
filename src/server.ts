import app from './app';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MovieBox API listening on http://localhost:${PORT}`);
});
