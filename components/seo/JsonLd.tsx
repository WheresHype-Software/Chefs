/**
 * Structured data for search engines (schema.org JSON-LD). It is data, not script: browsers don't
 * run it. "<" is escaped so text from profiles can never close the tag.
 */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
