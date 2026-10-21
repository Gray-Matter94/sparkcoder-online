<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Scope desktop layout overrides to named page hooks and a min-width media query in src/styles.css; this isolates presentation adjustments from existing smaller-screen rules.
- Apply learning-track themes through a root data attribute and CSS semantic-token overrides; keep option identities independent and preserve destructive error semantics.
- Discovery's parent route renders its hub only at the exact hub URL and an Outlet for section URLs; keep hub metadata off child matches so sections render and own their canonical.
