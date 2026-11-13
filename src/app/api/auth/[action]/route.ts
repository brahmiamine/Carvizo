import {
  currentUser,
  endSession,
  hashPassword,
  startSession,
  verifyPassword,
} from "@/lib/auth";
import { newRecoveryCode, recoveryHash } from "@/lib/password";
import { allowAttempt, requestAddress } from "@/lib/rate-limit";
import { isCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { error, jsonObject, ok, txt } from "@/lib/api";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ action: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  if ((await params).action !== "me") return error("Action inconnue", 404);
  const user = await currentUser();
  return user ? ok({ user }) : error("Non connecté", 401);
}
export async function POST(request: Request, { params }: Ctx) {
  const action = (await params).action;
  if (action === "logout") {
    await endSession();
    return ok({ success: true });
  }
  if (
    ![
      "signup",
      "login",
      "change-password",
      "recovery-code",
      "reset-password",
    ].includes(action)
  )
    return error("Action inconnue", 404);
  const address = requestAddress(request);
  if (!allowAttempt(`ip:${address}`, address === "local" ? 1000 : 60))
    return error("Trop de tentatives. Réessaie dans 15 minutes.", 429);
  const body = await jsonObject(request);
  if (!body) return error("JSON invalide");
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 10 || password.length > 128)
    return error("Le mot de passe doit contenir entre 10 et 128 caractères.");
  if (action === "change-password" || action === "recovery-code") {
    const user = await currentUser();
    if (!user) return error("Connexion requise", 401);
    if (!allowAttempt(`user:${user.id}`, 10))
      return error("Trop de tentatives. Réessaie dans 15 minutes.", 429);
    const record = await db.user.findUnique({ where: { id: user.id } });
    const currentPassword =
      action === "change-password" ? body.currentPassword : password;
    if (
      typeof currentPassword !== "string" ||
      currentPassword.length > 128 ||
      !record ||
      !(await verifyPassword(currentPassword, record.passwordHash))
    )
      return error("Mot de passe actuel incorrect", 403);
    if (action === "recovery-code") {
      const recoveryCode = newRecoveryCode();
      await db.user.update({
        where: { id: user.id },
        data: { recoveryCodeHash: recoveryHash(recoveryCode) },
      });
      return ok({ recoveryCode });
    }
    const passwordHash = await hashPassword(password);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]);
    await startSession(user.id);
    return ok({ success: true });
  }
  const email = txt(body.email, 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return error("Adresse e-mail invalide.");
  if (!allowAttempt(`account:${email}`, 10))
    return error("Trop de tentatives. Réessaie dans 15 minutes.", 429);
  if (action === "signup") {
    if (body.currency !== undefined && !isCurrency(body.currency))
      return error("Devise non prise en charge.");
    const currency = isCurrency(body.currency) ? body.currency : "EUR";
    const name = txt(body.name, 100);
    if (!name) return error("Renseigne ton nom.");
    const recoveryCode = newRecoveryCode();
    try {
      const user = await db.user.create({
        data: {
          email,
          name,
          currency,
          passwordHash: await hashPassword(password),
          recoveryCodeHash: recoveryHash(recoveryCode),
        },
      });
      await startSession(user.id);
      return ok(
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            currency: user.currency,
          },
          recoveryCode,
        },
        201,
      );
    } catch (e) {
      if ((e as { code?: string }).code === "P2002")
        return error("Cette adresse est déjà utilisée.", 409);
      throw e;
    }
  }
  const user = await db.user.findUnique({ where: { email } });
  if (action === "reset-password") {
    const supplied =
      typeof body.recoveryCode === "string" ? body.recoveryCode : "";
    if (
      !user ||
      supplied.length > 100 ||
      !user.recoveryCodeHash ||
      recoveryHash(supplied) !== user.recoveryCodeHash
    )
      return error("Adresse ou code de récupération incorrect.", 401);
    const recoveryCode = newRecoveryCode(),
      passwordHash = await hashPassword(password);
    // Consume the recovery code atomically: simultaneous resets cannot reuse it.
    const changed = await db.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: user.id, recoveryCodeHash: user.recoveryCodeHash },
        data: { passwordHash, recoveryCodeHash: recoveryHash(recoveryCode) },
      });
      if (result.count !== 1) return false;
      await tx.session.deleteMany({ where: { userId: user.id } });
      return true;
    });
    if (!changed) return error("Code déjà utilisé.", 401);
    await startSession(user.id);
    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
      },
      recoveryCode,
    });
  }
  // Derive a hash even for unknown accounts to reduce account timing disclosure.
  if (
    !(await verifyPassword(
      password,
      user?.passwordHash ??
        "scrypt$00000000000000000000000000000000$" + "0".repeat(128),
    )) ||
    !user
  )
    return error("Identifiants incorrects.", 401);
  await startSession(user.id);
  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    },
  });
}
