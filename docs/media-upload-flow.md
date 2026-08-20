# Media Upload Pipeline - Deep Dive

**Source of truth:** `app/Http/Controllers/Admin/MediaController.php`, `app/Domains/System/Services/MediaUploadService.php`. **Date:** 2026-08-07

> + = verified from source | ~ = inferred | ? = unknown

## Route & authorization

- `Admin\MediaController` - all actions call `$this->authorize('manage_media')` (gate from the permission catalog). +
- Endpoints (admin API): `GET .../media`, `POST .../media`, `DELETE .../media/{media}`. See [api.md](api.md) for full paths. +

## Upload flow

`POST media` -> validate -> MediaUploadService::upload(file, directory='media/Y/m', disk='public', altTextEn, altTextAr) -> Media row -> audit event. +

**Controller validation:** `file: required|file|max:10240` (10 MB) + optional alt texts (max 200 chars). +

**Service-side validations** (belt-and-suspenders, from config `security.uploads`):
- Size check again against `config('security.uploads.max_file_size', 10240)` KB. +
- **Server-detected MIME** (`$file->getMimeType()`) must be in `allowed_mime_types` (never trust client filename/mime). +
- Client-extension against `blocked_extensions` list. +
- **Double-extension defense**: reject if the original name contains more than one dot with a blocked token anywhere except the final extension. +
- Filename is a **random UUID** plus sanitized lowercase extension - prevents path traversal and guessability.+

Storage

- Disk: `MediaController` passes `disk: 'public'` — admin uploads are site content (product covers etc.) and must be publicly viewable via `/storage/` (deployment.md §8). The service still defaults to `config('filesystems.default')` (`local` by default; private, `serve=false` — see security.md S-21) for any other caller. +
- Path layout: `{directory}/{uuid}.{ext}`, e.g. `media/2026/08/2f0f...png`. +
- Media row records: `disk`, `path`, `filename`, `original_name`, `mime_type`, `size`, `alt_text_en`, `alt_text_ar`, `uploaded_by` = `Auth::id()`. +

## Delete flow

`DELETE media/{media}` -> Audit `media.deleted` first -> `Storage::disk($media->disk)->delete($media->path)` -> `$media->delete()`. +

- Note ordering: audit logged before deletion so the row exists with context (audit entry holds the id only; the file path is gone afterward - acceptable loss). ~

## Serving

- Media URL from model accessor (`url` attribute) - served via the public route/`storage` symlink. +
- No image variant generation (no thumbnails, no responsive sizes). Frontend uses `human_size` and original file. ~

## Security notes

- Server-side MIME detection plus blocked-extension list plus size cap and randomized names gives a reasonable upload baseline. +
- `storage/app/private` was publicly served via default `local` disk `serve=true` - flagged as S-21. + RESOLVED Sprint 1: `config/filesystems.php` published with `local` = private, `serve=false`.
- Uploaded file is stored under `media/` inside storage; index controller maps it out through `url` accessor. +

## Audit

- `media.uploaded` (newValues filename/mime/size) on store; `media.deleted` on destroy. +