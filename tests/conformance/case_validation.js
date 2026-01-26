export function parseCalendarUrl(url) {
    const [, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    return {
        text: params.get('text'),
        dates: params.get('dates'),
        location: params.get('location'),
        recur: params.get('recur')
    };
}

export function evaluateCase(testCase, result) {
    const failures = [];
    const safe = (value) => value ?? '';

    if (testCase.expected.text && !testCase.expected.text.test(safe(result.text))) {
        failures.push('text');
    }
    if (testCase.expected.dates && !testCase.expected.dates.test(safe(result.dates))) {
        failures.push('dates');
    }
    if (testCase.expected.location && !testCase.expected.location.test(safe(result.location))) {
        failures.push('location');
    }
    if (testCase.expected.recur && !testCase.expected.recur.test(safe(result.recur))) {
        failures.push('recur');
    }
    if (testCase.expected.custom) {
        try {
            if (!testCase.expected.custom(result)) {
                failures.push('custom');
            }
        } catch (error) {
            failures.push('custom');
        }
    }

    return {
        success: failures.length === 0,
        failures
    };
}
