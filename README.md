# Amulet Cycle 168 public website

Production-oriented, multilingual static catalogue for GitHub Pages. Inventory, stories, product details, and product images are loaded from the Sanity `production` dataset.

## Public pages

- `index.html` — brand homepage and featured inventory
- `inventory.html` — searchable, filterable Sanity inventory
- `product.html?id=AC168-0001` — reusable dynamic listing page
- `story.html` — stories sourced from published inventory records
- `about.html` — collector-house positioning and publishing principles
- `contact.html` — equal-weight WhatsApp, WeChat, telephone, optional email/LINE, address, and inquiry tools
- `policies.html` — shipping, returns, authenticity, privacy, and website terms
- `404.html` — GitHub Pages fallback

## Publishing an inventory item

1. Create the item in Sanity Studio.
2. Assign a permanent `AC168-0001`-style inventory ID and generate its slug.
3. Complete the English name and all known identification, condition, provenance, and commercial details.
4. Upload at least one image and assign its image type. The first/front image becomes the primary image.
5. Keep unverified claims out of public fields. Use authentication notes to distinguish opinion, attribution, and documented fact.
6. Choose Available, Reserved, Sold, or Archived.
7. Turn on **Show on Website**, then publish.

The public website never exposes Sanity write credentials. All editing remains inside authenticated Sanity Studio.

## Before each public release

- Verify inventory and product pages against at least one real item.
- Check English, Thai, and Simplified Chinese switching.
- Check phone and desktop layouts.
- Review contact details and policy dates.
- Confirm `CNAME` still contains `www.amuletcycle168.com`.
