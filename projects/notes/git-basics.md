# Git basics

## Starting out

```bash
git init                          # start a repo in the current folder
git clone <url>                   # copy an existing repo
git status                        # what has changed
```

## Everyday cycle

```bash
git add <file>                    # stage one file
git add .                         # stage everything in the current folder
git commit -m "message"           # save staged changes
git log --oneline                 # compact history
git diff                          # unstaged changes
git diff --staged                 # staged changes
```

## Branches

```bash
git branch                        # list branches
git switch -c <name>              # create and switch to a branch
git switch <name>                 # switch to an existing branch
git merge <name>                  # merge <name> into the current branch
git branch -d <name>              # delete a merged branch
```

## Remotes

```bash
git remote -v                     # list remotes
git push -u origin <branch>       # push and set upstream
git pull origin <branch>          # fetch and merge
git fetch origin                  # fetch without merging
```

## Undoing things

```bash
git restore <file>                # discard unstaged changes to a file
git restore --staged <file>       # unstage a file, keep the changes
git commit --amend                # rewrite the last commit
git revert <commit>               # new commit that undoes <commit>
git reset --hard <commit>         # discard commits (destructive)
```

`git reset --hard` throws work away permanently. Check `git status` first.

## Useful checks

```bash
git show <commit>                 # what a commit changed
git blame <file>                  # who last touched each line
git stash                         # shelve changes temporarily
git stash pop                     # bring them back
```
