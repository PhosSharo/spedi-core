'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getApiUrl } from '@/lib/api';

// Scalar styles
import '@scalar/api-reference-react/style.css';

export default function DocsPage() {
    return (
        <div className="p-4 lg:p-6 flex flex-col gap-4 h-full">
            <div className="border-b border-border pb-4 flex items-end justify-between">
                <div>
                    <h1 className="text-lg font-bold tracking-widest uppercase font-sans text-foreground">API_Documentation //</h1>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase font-sans tracking-widest">Interactive reference generated from the OpenAPI spec.</p>
                </div>
            </div>

            <div className="rounded-sm border border-border overflow-hidden bg-background flex-1 flex flex-col">
                <ApiReferenceReact
                    configuration={{
                        url: `${getApiUrl()}/openapi.json`,
                        theme: 'kepler',
                        layout: 'classic',
                        hideModels: false,
                        hideDownloadButton: false,
                        darkMode: true,
                        searchHotKey: 'k',
                        authentication: {
                            preferredSecurityScheme: 'BearerAuth',
                        },
                    }}
                />
            </div>
        </div>
    );
}
