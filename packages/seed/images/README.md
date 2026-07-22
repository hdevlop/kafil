# Seed profile images

Place every demo profile image directly in this folder using one of these name
patterns:

- `family-01.jpg`, `family-02.png`, ...
- `sponsor-01.webp`, `sponsor-02.jpg`, ...

Use a numeric suffix containing at least two digits. Each family or sponsor
number must be unique even when the file extensions differ. Images are assigned
in numeric order and used once only. When there are fewer images than demo
accounts, the remaining accounts keep an empty image and use their fallback
avatar.

Supported formats: AVIF, GIF, JPEG, PNG, and WebP. Each file must be between
1 byte and 5 MB. Nested folders and other filename patterns are rejected.
