# Chapter 1: 2,500 PRs result from a ready environment, not a target

[Contents](README.md) · [Previous](02-chapter.md) · [Next](04-chapter.md) · [简体中文](../zh-CN/03-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/74ae41) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/15df58)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
The 2,500 PRs a month were not a number anyone aimed for. <strong>The number followed from building an environment where you can delegate work to agents with confidence</strong>.

This chapter looks at why you should not make the count a target, and at what the count really stands for.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter is organized as follows.

- Why you should not make the count a target
- What the count stands for
- Summary: shift your view from the count to "the conditions for delegating"

<a id="why-you-should-not-make-the-count-a-target"></a>


## Why you should not make the count a target

There are two reasons.

The first is that when you raise only the count, <strong>what grows is not results but unverified changes</strong>.

As long as a person reads each diff the agent wrote and tries the app to verify it, the ceiling on the count is the amount a person can check.

If you decide in this state to "double the PRs this month," you only double the number of requests you send to the agent. The number of people who check does not grow, so the added requests pile up unverified.

<strong>Nobody knows which changes are correct and which are broken until someone verifies them one by one later</strong>.

The other reason is that <strong>the count is a number you can move with little effort</strong>.  
The same feature is 1 PR if you put it in one large PR, and it is 5 PRs if you split it into five.

If the count is the target, you can make the number look better by splitting PRs into smaller ones, while the content of the changes stays the same.

<a id="what-the-count-stands-for"></a>


## What the count stands for

I think what the count really stands for is <strong>the amount of checking that moved out of human hands and into the agent's side</strong>.

As the previous section showed, if people verify everything, the count cannot exceed what people can check. Put the other way, if the count far exceeds what people can check, something other than people must be doing most of the checking.

In [Part 1](https://x.com/poteto/status/2094457600259842065) of *The Complete Guide to pstack*, poteto defines verification as "<strong>the agent being able to check its own work</strong>," and writes that this ability keeps people from becoming the bottleneck.

So what does it take to move checking out of human hands?

It takes the following four things. They were also the four themes of poteto's [talk](https://x.com/poteto/status/2102050467505430555).

1. Trust
2. Ways to raise trust
3. The codebase as memory
4. Automation

The most important point is that these four are not independent tips. Each item is the precondition, the base, for the next one.

In other words, you have to keep this order. First make the artifacts verifiable, then record the knowledge you gain there in the codebase, and then build automation on that base.

The number 2,500 a month is the result of putting these four in place in order. [Chapter 2](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/950071) through [Chapter 5](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/aa6858) of this book cover the four, one chapter each.

<a id="summary%3A-shift-your-view-from-the-count-to-%22the-conditions-for-delegating%22"></a>


## Summary: shift your view from the count to "the conditions for delegating"

- <strong>Why you should not make the count a target.</strong> If you raise the count while the number of people who check stays the same, what grows is unverified changes. The count also moves with the way you split PRs.
- <strong>What the count stands for.</strong> It is the amount of checking that moved out of human hands and into the agent's side. Behind it is a state where all four are in place: trust, ways to raise trust, the codebase as memory, and automation.

The next chapter, [Chapter 2](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/950071), covers the first of the four, "trust." The talk says that what you trust is not the agent but the artifacts the agent makes. The chapter looks at how pstack puts this idea into practice.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](02-chapter.md) · [Next](04-chapter.md) · [简体中文](../zh-CN/03-chapter.md)
