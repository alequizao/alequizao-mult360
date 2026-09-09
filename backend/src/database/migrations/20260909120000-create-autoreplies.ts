import { QueryInterface, DataTypes } from "sequelize";

// ALEQUIZAO: respostas automáticas por palavra-chave (sem fila)
module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("AutoReplies", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false },
      keywords: { type: DataTypes.TEXT, allowNull: false },
      reply: { type: DataTypes.TEXT, allowNull: false },
      matchType: { type: DataTypes.STRING, allowNull: false, defaultValue: "contains" },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      onlyWithoutUser: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      stopFlow: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      cooldownMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
      hits: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      companyId: { type: DataTypes.INTEGER, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE", allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
  },
  down: (queryInterface: QueryInterface) => queryInterface.dropTable("AutoReplies")
};
