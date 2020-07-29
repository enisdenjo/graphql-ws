# Contributing to `domonda.js`

- [Report Issues](#issues)
- [Commit Message Guidelines](#commit)

## <a name="issues"></a>Reporting Issues

Issues are for bugs or features. Please consider the following checklist.

### Checklist

- [x] Does your title concisely summarize the problem?
- [x] Is it possible for you to include a minimal, reproducable example? Is it an [SSCCE](http://sscce.org)?
- [x] What OS and browser are you using? What versions?
- [x] Did you use a Issue Template?

### Guidelines

- **Keep it concise.** Longer issues are harder to understand.
- **Keep it focused.** Solving three vague problems is harder than solving one specific problem.
- **Be friendly!** Everyone is working hard and trying to be effective.

## <a name="commit"></a> Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted. This leads to **more
readable messages** that are easy to follow when looking through the **project history**. But also,
we use the git commit messages to **generate the Changelog**.

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

Any line of the commit message cannot be longer 100 characters! This allows the message to be easier
to read on GitHub as well as in various git tools.

Footer should contain a [closing reference to an issue](https://help.github.com/articles/autolinked-references-and-urls/#commit-shas) if any.

```
docs(changelog): update change log to beta.5
```

```
fix(release): need to depend on latest rxjs and zone.js

```

### Revert

If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

### Type

Must be one of the following:

- **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **test**: Adding missing tests or correcting existing tests

### Scope

The scope should be the name of the npm package affected (as perceived by person reading changelog generated from commit messages.

The following is the list of supported scopes:

- **authentication**
- **common**
- **compiler**
- **core**
- **forms**
- **http**
- **router**
- **service-worker**
- **upgrade**

### Subject

The subject contains succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to
reference Gitlab issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## Comments in Code

We use a convention for comments in code:
{NOTE/FIXME/TODO}-{initials}-{YYMMDD} descriptive text

so for example: // TODO-db-19001 leaving a todo note here for the next guy (or future me)
