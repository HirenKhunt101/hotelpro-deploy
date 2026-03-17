/// <reference lib="webworker" />

addEventListener('message', async ({ data }) => {
  try {
    const response = await fetch(data.url, {
      method: data.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...data.headers,
      },
      body: JSON.stringify(data.body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    postMessage({ status: 'success', data: result });
  } catch (error: any) {
    postMessage({ status: 'error', message: error.message });
    console.error('There was an error!', error);
  }
});
