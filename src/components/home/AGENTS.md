# Home components

- The homepage (`src/routes/index.tsx`) renders the `Ent*` sections from `src/components/home/EnterpriseHome.tsx` plus the shared `AllInOnePlatformSection`; its Latest news cards come from the loader (`home-articles.ts`) and show each article's stored `image_url` (other pages use generated covers); older section files in `src/components/home/` are kept unused for quick rollback. Dashboard pages get the Platform look from the scoped `.jenvu-zoom-dashboard main` rules at the end of `src/styles.css`: restyle there once instead of per page.
