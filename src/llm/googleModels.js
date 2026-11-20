export async function listGoogleModels(apiKey, signal) {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models');
    const models = new Map();
    let pageToken;

    do {
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const response = await fetch(url, {
            headers: { 'x-goog-api-key': apiKey },
            signal
        });
        if (!response.ok) {
            if ([400, 401, 403].includes(response.status)) {
                throw new Error('Google rejected the catalog request. Check your AI Studio key and project access.');
            }
            throw new Error('Could not load Google models (HTTP ' + response.status + ').');
        }

        const page = await response.json();
        for (const model of page.models ?? []) {
            const id = model.name?.match(/^models\/(gemini-[\w.-]+)$/i)?.[1];
            if (!id || !model.supportedGenerationMethods?.includes('generateContent')) continue;
            // Specialized models can also advertise generateContent.
            if (/(?:^|-)(?:image|tts|audio|live|robotics|computer-use)(?:-|\.|$)/i.test(id)) continue;
            models.set(id, { id, name: model.displayName || id });
        }
        pageToken = page.nextPageToken;
    } while (pageToken);

    return [...models.values()].sort((a, b) => {
        const numbered = /^gemini-\d/;
        const familyOrder = Number(numbered.test(b.id)) - Number(numbered.test(a.id));
        return familyOrder || b.id.localeCompare(a.id, 'en', { numeric: true });
    });
}
