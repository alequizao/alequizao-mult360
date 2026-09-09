import { QueryInterface, DataTypes } from "sequelize";

// ALEQUIZAO: histórico de edições de contatos
module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("ContactHistories", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      contactId: { type: DataTypes.INTEGER, references: { model: "Contacts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE", allowNull: false },
      userId: { type: DataTypes.INTEGER, references: { model: "Users", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL", allowNull: true },
      userName: { type: DataTypes.STRING, allowNull: true },
      action: { type: DataTypes.STRING, allowNull: false, defaultValue: "editado" },
      changes: { type: DataTypes.TEXT, allowNull: true },
      companyId: { type: DataTypes.INTEGER, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false }
    });
  },
  down: (queryInterface: QueryInterface) => queryInterface.dropTable("ContactHistories")
};
