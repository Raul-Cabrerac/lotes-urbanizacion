/**
 * Implementaciones de seguridad: contraseñas con bcrypt y sesiones con JWT.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ErrorNoAutenticado } from '../dominio/errores';
import type { DatosToken, Hasher, ServicioTokens } from '../aplicacion/puertos';

export class HasherBcrypt implements Hasher {
  constructor(private readonly rondas: number) {}

  hashear(texto: string): Promise<string> {
    return bcrypt.hash(texto, this.rondas);
  }

  comparar(texto: string, hash: string): Promise<boolean> {
    return bcrypt.compare(texto, hash);
  }
}

export class ServicioTokensJwt implements ServicioTokens {
  constructor(
    private readonly secreto: string,
    private readonly expiraEn: string,
  ) {}

  generar({ usuarioId }: DatosToken): string {
    return jwt.sign({}, this.secreto, {
      subject: String(usuarioId),
      expiresIn: this.expiraEn as jwt.SignOptions['expiresIn'],
    });
  }

  verificar(token: string): DatosToken {
    try {
      const datos = jwt.verify(token, this.secreto) as jwt.JwtPayload;
      const usuarioId = Number(datos.sub);
      if (!Number.isInteger(usuarioId)) throw new Error('Token sin datos válidos');
      return { usuarioId };
    } catch {
      throw new ErrorNoAutenticado('Su sesión expiró o no es válida. Inicie sesión nuevamente.', 'TOKEN_INVALIDO');
    }
  }
}
